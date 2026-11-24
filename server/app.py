import os
import random
import string
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from flask_session import Session
from dotenv import load_dotenv
from mysql.connector import Error
from werkzeug.security import check_password_hash

from db import get_connection, test_connection
from notify import email_alerts_enabled, notify_escalation, notify_new_request

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

app = Flask(__name__)

# ─── Sessions & CORS ───
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
Session(app)
app.config["SESSION_COOKIE_SAMESITE"] = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
app.config["SESSION_COOKIE_SECURE"] = os.getenv("SESSION_COOKIE_SECURE", "0") == "1"
app.config["SESSION_COOKIE_HTTPONLY"] = True

CLIENT_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CLIENT_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
CORS(app, supports_credentials=True, origins=CLIENT_ORIGINS)

# Serve the built React client from this service when enabled (single origin).
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIST = os.getenv("CLIENT_DIST") or os.path.join(SERVER_DIR, "..", "client", "dist")
SERVE_CLIENT = os.getenv("SERVE_CLIENT", "0") == "1" and os.path.isfile(
    os.path.join(CLIENT_DIST, "index.html")
)

# Priority workflow: urgent requests escalate to the backup when nobody
# acknowledges them in time. High/normal requests carry a follow-up deadline.
URGENT_ESCALATION_MINUTES = int(os.getenv("URGENT_ESCALATION_MINUTES", "10"))
FOLLOW_UP_HOURS = {"urgent": 1, "high": 24, "normal": 48}
URGENCY_RANK = {"urgent": 0, "high": 1, "normal": 2}


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────

def generate_tracking_code():
    conn = get_connection()
    if not conn:
        raise RuntimeError("Database unavailable")
    cursor = conn.cursor()
    try:
        while True:
            suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
            code = f"SC-{suffix}"
            cursor.execute("SELECT 1 FROM appointments WHERE tracking_code = %s", (code,))
            if not cursor.fetchone():
                return code
    finally:
        cursor.close()
        conn.close()


def log_action(user_id, action, target_id=None, details=None):
    conn = get_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_log (user_id, action, target_id, details) VALUES (%s, %s, %s, %s)",
            (user_id, action, target_id, details)
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def current_counsellor():
    user_id = session.get("user_id")
    role = session.get("role")
    if not user_id or role != "counsellor":
        return None
    return {"id": user_id, "email": session.get("email"), "role": role}


def require_counsellor():
    user = current_counsellor()
    if user:
        return user, None
    if current_staff():
        return None, (jsonify({"error": "Counsellor access required."}), 403)
    return None, (jsonify({"error": "Counsellor authentication required."}), 401)


def current_staff():
    user_id = session.get("user_id")
    role = session.get("role")
    if not user_id or role not in ("counsellor", "admin"):
        return None
    return {"id": user_id, "email": session.get("email"), "role": role}


def require_staff():
    user = current_staff()
    if not user:
        return None, (jsonify({"error": "Staff authentication required."}), 401)
    return user, None


def require_admin():
    user = current_staff()
    if not user:
        return None, (jsonify({"error": "Staff authentication required."}), 401)
    if user["role"] != "admin":
        return None, (jsonify({"error": "Administrator access required."}), 403)
    return user, None


def iso(value):
    return value.isoformat() if value else None


def find_appointment_by_code(cursor, tracking_code):
    cursor.execute(
        """
        SELECT id, tracking_code, urgency, status, acknowledged_at, escalated_at,
               follow_up_due, scheduled_for, created_at, updated_at
        FROM appointments WHERE tracking_code = %s
        """,
        (tracking_code,),
    )
    return cursor.fetchone()


def escalate_overdue_urgent(cursor):
    """Escalate urgent requests nobody has acknowledged in time.

    Runs lazily whenever staff load the queue, so no background scheduler is
    required. Escalation is recorded once per request and alerts the backup
    counsellor when email alerts are configured.
    """
    cursor.execute(
        """
        SELECT id, tracking_code, TIMESTAMPDIFF(MINUTE, created_at, NOW()) AS minutes_waiting
        FROM appointments
        WHERE urgency = 'urgent'
          AND acknowledged_at IS NULL
          AND escalated_at IS NULL
          AND status NOT IN ('completed', 'cancelled')
          AND created_at <= DATE_SUB(NOW(), INTERVAL %s MINUTE)
        """,
        (URGENT_ESCALATION_MINUTES,),
    )
    overdue = cursor.fetchall()

    for appointment in overdue:
        cursor.execute(
            "UPDATE appointments SET escalated_at = NOW() WHERE id = %s AND escalated_at IS NULL",
            (appointment["id"],),
        )
        if cursor.rowcount != 1:
            continue
        cursor.execute(
            "INSERT INTO audit_log (user_id, action, target_id, details) VALUES (NULL, %s, %s, %s)",
            (
                "escalation_triggered",
                appointment["id"],
                f"code={appointment['tracking_code']} unacknowledged_minutes={appointment['minutes_waiting']}",
            ),
        )
        notify_escalation(appointment["tracking_code"], appointment["minutes_waiting"])


# ─────────────────────────────────────────────────────────
# Health & Root
# ─────────────────────────────────────────────────────────

@app.get("/")
def home():
    if SERVE_CLIENT:
        return send_from_directory(CLIENT_DIST, "index.html")
    return jsonify({"message": "StudentCare API is running", "status": "success"})


@app.get("/api/health")
def health():
    return jsonify({
        "service": "StudentCare",
        "backend": "Flask",
        "database": "MySQL",
        "db_connected": test_connection()
    })


# ─────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, email, password_hash, role FROM users WHERE email = %s",
            (email,)
        )
        user = cursor.fetchone()

        if not user or not user["password_hash"].startswith(("pbkdf2:", "scrypt:")):
            return jsonify({"error": "Invalid credentials."}), 401

        if not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Invalid credentials."}), 401

        if user["role"] not in ("counsellor", "admin"):
            return jsonify({"error": "This portal is for counselling staff only."}), 403

        session["user_id"] = user["id"]
        session["email"] = user["email"]
        session["role"] = user["role"]

        log_action(user["id"], "login", None, f"email={user['email']}")

        return jsonify({
            "success": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"],
            }
        }), 200

    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/auth/logout")
def logout():
    user_id = session.get("user_id")
    if user_id:
        log_action(user_id, "logout")
    session.clear()
    return jsonify({"success": True}), 200


@app.get("/api/auth/me")
def me():
    user = current_staff()
    if not user:
        return jsonify({"authenticated": False}), 200
    return jsonify({"authenticated": True, "user": user}), 200


# ─────────────────────────────────────────────────────────
# APPOINTMENTS — Public (student side)
# ─────────────────────────────────────────────────────────

@app.post("/api/appointments")
def create_appointment():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    preferred_contact = (data.get("preferred_contact") or "").strip().lower()
    urgency = (data.get("urgency") or "normal").strip().lower()

    if not email or "@" not in email or len(email) > 120:
        return jsonify({"error": "A valid email is required."}), 400
    if preferred_contact not in ("email", "phone", "in-person"):
        return jsonify({
            "error": "preferred_contact must be one of: email, phone, in-person."
        }), 400
    if urgency not in URGENCY_RANK:
        return jsonify({
            "error": "urgency must be one of: urgent, high, normal."
        }), 400

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if user:
            student_id = user["id"]
        else:
            cursor.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, 'student')",
                (email, "PENDING_AUTH")
            )
            student_id = cursor.lastrowid

        tracking_code = generate_tracking_code()
        cursor.execute(
            """
            INSERT INTO appointments
              (tracking_code, student_id, preferred_contact, urgency, status, follow_up_due)
            VALUES (%s, %s, %s, %s, 'pending', DATE_ADD(NOW(), INTERVAL %s HOUR))
            """,
            (tracking_code, student_id, preferred_contact, urgency, FOLLOW_UP_HOURS[urgency])
        )
        conn.commit()

        notify_new_request(urgency, tracking_code)

        return jsonify({
            "success": True,
            "message": "Appointment request received.",
            "tracking_code": tracking_code,
            "urgency": urgency,
            "status": "pending",
        }), 201

    except Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {e}"}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.get("/api/appointments/<tracking_code>")
def get_appointment(tracking_code):
    tracking_code = tracking_code.strip().upper()
    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT tracking_code, preferred_contact, urgency, status,
                   acknowledged_at, scheduled_for, created_at, updated_at
            FROM appointments WHERE tracking_code = %s
            """,
            (tracking_code,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "No appointment found for that code."}), 404

        row["acknowledged"] = row["acknowledged_at"] is not None
        row["acknowledged_at"] = iso(row["acknowledged_at"])
        row["scheduled_for"] = iso(row["scheduled_for"])
        row["created_at"] = iso(row["created_at"])
        row["updated_at"] = iso(row["updated_at"])

        return jsonify(row), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────
# APPOINTMENTS — Counsellor only
# ─────────────────────────────────────────────────────────

@app.get("/api/appointments")
def list_appointments():
    user, err = require_counsellor()
    if err:
        return err

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        escalate_overdue_urgent(cursor)
        cursor.execute(
            """
            SELECT a.id, a.tracking_code, a.preferred_contact, a.urgency, a.status,
                   a.created_at, a.updated_at, a.acknowledged_at, a.escalated_at,
                   a.follow_up_due, a.scheduled_for,
                   u.email AS student_email,
                   staff.email AS acknowledged_by_email,
                   (SELECT COUNT(*) FROM messages m WHERE m.appointment_id = a.id) AS message_count,
                   (a.urgency = 'urgent' AND a.acknowledged_at IS NULL
                      AND a.status NOT IN ('completed', 'cancelled')) AS needs_acknowledgement,
                   (a.follow_up_due IS NOT NULL AND a.follow_up_due < NOW()
                      AND a.status IN ('pending', 'scheduled')) AS follow_up_overdue,
                   CASE WHEN a.urgency = 'urgent' AND a.acknowledged_at IS NULL
                        THEN TIMESTAMPDIFF(MINUTE, a.created_at, NOW()) END AS minutes_waiting
            FROM appointments a
            JOIN users u ON u.id = a.student_id
            LEFT JOIN users staff ON staff.id = a.acknowledged_by
            ORDER BY
              (a.status IN ('completed', 'cancelled')),
              CASE a.urgency WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
              (a.acknowledged_at IS NOT NULL),
              a.created_at ASC
            """
        )
        rows = cursor.fetchall()
        conn.commit()

        log_action(user["id"], "view_all_appointments", None, f"count={len(rows)}")

        datetime_fields = (
            "created_at", "updated_at", "acknowledged_at",
            "escalated_at", "follow_up_due", "scheduled_for",
        )
        alerts = []
        for row in rows:
            row["needs_acknowledgement"] = bool(row["needs_acknowledgement"])
            row["follow_up_overdue"] = bool(row["follow_up_overdue"])
            for field in datetime_fields:
                row[field] = iso(row[field])
            if row["needs_acknowledgement"]:
                alerts.append({
                    "appointment_id": row["id"],
                    "tracking_code": row["tracking_code"],
                    "minutes_waiting": int(row["minutes_waiting"] or 0),
                    "escalated": row["escalated_at"] is not None,
                })

        stats = {
            "open": sum(1 for r in rows if r["status"] in ("pending", "scheduled")),
            "pending": sum(1 for r in rows if r["status"] == "pending"),
            "scheduled": sum(1 for r in rows if r["status"] == "scheduled"),
            "urgent_unacknowledged": len(alerts),
            "urgent_escalated": sum(1 for r in rows if r["escalated_at"]),
            "follow_ups_overdue": sum(1 for r in rows if r["follow_up_overdue"]),
        }

        return jsonify({
            "count": len(rows),
            "appointments": rows,
            "alerts": alerts,
            "stats": stats,
            "escalation_minutes": URGENT_ESCALATION_MINUTES,
            "email_alerts_enabled": email_alerts_enabled(),
        }), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.patch("/api/appointments/<int:appointment_id>/status")
def update_appointment_status(appointment_id):
    user, err = require_counsellor()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip().lower()

    if new_status not in ("pending", "scheduled", "completed", "cancelled"):
        return jsonify({"error": "Invalid status value."}), 400

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, status FROM appointments WHERE id = %s", (appointment_id,))
        appointment = cursor.fetchone()
        if not appointment:
            return jsonify({"error": "Appointment not found."}), 404

        old_status = appointment["status"]

        cursor.execute(
            "UPDATE appointments SET status = %s WHERE id = %s",
            (new_status, appointment_id)
        )
        conn.commit()

        log_action(user["id"], "update_status", appointment_id, f"{old_status} -> {new_status}")

        return jsonify({
            "success": True,
            "appointment_id": appointment_id,
            "old_status": old_status,
            "new_status": new_status,
        }), 200
    except Error as e:
        conn.rollback()
        return jsonify({"error": f"Database error: {e}"}), 500
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/appointments/<int:appointment_id>/acknowledge")
def acknowledge_appointment(appointment_id):
    user, err = require_counsellor()
    if err:
        return err

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, tracking_code, acknowledged_at FROM appointments WHERE id = %s",
            (appointment_id,)
        )
        appointment = cursor.fetchone()
        if not appointment:
            return jsonify({"error": "Appointment not found."}), 404

        already = appointment["acknowledged_at"] is not None
        if not already:
            cursor.execute(
                """
                UPDATE appointments
                SET acknowledged_at = NOW(), acknowledged_by = %s
                WHERE id = %s AND acknowledged_at IS NULL
                """,
                (user["id"], appointment_id)
            )
            conn.commit()
            log_action(
                user["id"], "acknowledge_request", appointment_id,
                f"code={appointment['tracking_code']}"
            )

        cursor.execute(
            "SELECT acknowledged_at FROM appointments WHERE id = %s",
            (appointment_id,)
        )
        acknowledged_at = iso(cursor.fetchone()["acknowledged_at"])

        return jsonify({
            "success": True,
            "appointment_id": appointment_id,
            "already_acknowledged": already,
            "acknowledged_at": acknowledged_at,
        }), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.patch("/api/appointments/<int:appointment_id>/schedule")
def schedule_appointment(appointment_id):
    user, err = require_counsellor()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    raw = data.get("scheduled_for")
    scheduled_value = None
    if raw:
        try:
            parsed = datetime.fromisoformat(str(raw).replace("Z", ""))
        except ValueError:
            return jsonify({"error": "scheduled_for must be an ISO date and time."}), 400
        scheduled_value = parsed.strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, tracking_code, status, scheduled_for FROM appointments WHERE id = %s",
            (appointment_id,)
        )
        appointment = cursor.fetchone()
        if not appointment:
            return jsonify({"error": "Appointment not found."}), 404

        new_status = appointment["status"]
        if scheduled_value and new_status == "pending":
            new_status = "scheduled"

        cursor.execute(
            "UPDATE appointments SET scheduled_for = %s, status = %s WHERE id = %s",
            (scheduled_value, new_status, appointment_id)
        )
        conn.commit()
        log_action(
            user["id"], "schedule_appointment", appointment_id,
            f"code={appointment['tracking_code']} scheduled_for={scheduled_value or 'cleared'}"
        )

        return jsonify({
            "success": True,
            "appointment_id": appointment_id,
            "scheduled_for": scheduled_value,
            "status": new_status,
        }), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────
# MESSAGES — students use their tracking code as the key
# ─────────────────────────────────────────────────────────

MAX_MESSAGE_LENGTH = 2000


def _message_rows(cursor, appointment_id):
    cursor.execute(
        """
        SELECT id, sender, body, created_at FROM messages
        WHERE appointment_id = %s ORDER BY created_at ASC, id ASC
        """,
        (appointment_id,)
    )
    rows = cursor.fetchall()
    for row in rows:
        row["created_at"] = iso(row["created_at"])
    return rows


@app.get("/api/requests/<tracking_code>/messages")
def student_thread(tracking_code):
    tracking_code = tracking_code.strip().upper()
    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        appointment = find_appointment_by_code(cursor, tracking_code)
        if not appointment:
            return jsonify({"error": "No request found for that code."}), 404
        return jsonify({
            "tracking_code": tracking_code,
            "messages": _message_rows(cursor, appointment["id"]),
        }), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/requests/<tracking_code>/messages")
def student_send_message(tracking_code):
    tracking_code = tracking_code.strip().upper()
    body = ((request.get_json(silent=True) or {}).get("body") or "").strip()
    if not body:
        return jsonify({"error": "Message cannot be empty."}), 400
    if len(body) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Messages are limited to {MAX_MESSAGE_LENGTH} characters."}), 400

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        appointment = find_appointment_by_code(cursor, tracking_code)
        if not appointment:
            return jsonify({"error": "No request found for that code."}), 404

        cursor.execute(
            "INSERT INTO messages (appointment_id, sender, body) VALUES (%s, 'student', %s)",
            (appointment["id"], body)
        )
        conn.commit()
        return jsonify({
            "success": True,
            "messages": _message_rows(cursor, appointment["id"]),
        }), 201
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.get("/api/appointments/<int:appointment_id>/messages")
def staff_thread(appointment_id):
    user, err = require_counsellor()
    if err:
        return err

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM appointments WHERE id = %s", (appointment_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Appointment not found."}), 404
        return jsonify({
            "appointment_id": appointment_id,
            "messages": _message_rows(cursor, appointment_id),
        }), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/appointments/<int:appointment_id>/messages")
def staff_send_message(appointment_id):
    user, err = require_counsellor()
    if err:
        return err

    body = ((request.get_json(silent=True) or {}).get("body") or "").strip()
    if not body:
        return jsonify({"error": "Message cannot be empty."}), 400
    if len(body) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Messages are limited to {MAX_MESSAGE_LENGTH} characters."}), 400

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, tracking_code FROM appointments WHERE id = %s",
            (appointment_id,)
        )
        appointment = cursor.fetchone()
        if not appointment:
            return jsonify({"error": "Appointment not found."}), 404

        cursor.execute(
            "INSERT INTO messages (appointment_id, sender, body) VALUES (%s, 'counsellor', %s)",
            (appointment_id, body)
        )
        conn.commit()
        log_action(
            user["id"], "reply_message", appointment_id,
            f"code={appointment['tracking_code']}"
        )
        return jsonify({
            "success": True,
            "messages": _message_rows(cursor, appointment_id),
        }), 201
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────
# CHECK-INS & FEEDBACK — no email stored, mood/rating only
# ─────────────────────────────────────────────────────────

@app.post("/api/checkins")
def create_checkin():
    data = request.get_json(silent=True) or {}
    mood = data.get("mood")
    tracking_code = (data.get("tracking_code") or "").strip().upper()

    if isinstance(mood, bool) or not isinstance(mood, int) or not 1 <= mood <= 5:
        return jsonify({"error": "mood must be a whole number from 1 to 5."}), 400

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        appointment_id = None
        if tracking_code:
            appointment = find_appointment_by_code(cursor, tracking_code)
            if not appointment:
                return jsonify({"error": "No request found for that tracking code."}), 404
            appointment_id = appointment["id"]

        cursor.execute(
            "INSERT INTO checkins (appointment_id, mood) VALUES (%s, %s)",
            (appointment_id, mood)
        )
        conn.commit()

        history = []
        if appointment_id:
            cursor.execute(
                """
                SELECT mood, created_at FROM checkins
                WHERE appointment_id = %s ORDER BY created_at DESC LIMIT 8
                """,
                (appointment_id,)
            )
            history = [
                {"mood": row["mood"], "created_at": iso(row["created_at"])}
                for row in reversed(cursor.fetchall())
            ]

        return jsonify({"success": True, "history": history}), 201
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.get("/api/requests/<tracking_code>/checkins")
def checkin_history(tracking_code):
    tracking_code = tracking_code.strip().upper()
    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        appointment = find_appointment_by_code(cursor, tracking_code)
        if not appointment:
            return jsonify({"error": "No request found for that code."}), 404

        cursor.execute(
            """
            SELECT mood, created_at FROM checkins
            WHERE appointment_id = %s ORDER BY created_at DESC LIMIT 8
            """,
            (appointment["id"],)
        )
        history = [
            {"mood": row["mood"], "created_at": iso(row["created_at"])}
            for row in reversed(cursor.fetchall())
        ]
        return jsonify({"tracking_code": tracking_code, "history": history}), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.post("/api/feedback")
def create_feedback():
    data = request.get_json(silent=True) or {}
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()
    tracking_code = (data.get("tracking_code") or "").strip().upper()

    if isinstance(rating, bool) or not isinstance(rating, int) or not 1 <= rating <= 5:
        return jsonify({"error": "rating must be a whole number from 1 to 5."}), 400
    if len(comment) > 500:
        return jsonify({"error": "Feedback comments are limited to 500 characters."}), 400

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        appointment_id = None
        if tracking_code:
            appointment = find_appointment_by_code(cursor, tracking_code)
            if not appointment:
                return jsonify({"error": "No request found for that tracking code."}), 404
            appointment_id = appointment["id"]

        cursor.execute(
            "INSERT INTO feedback (appointment_id, rating, comment) VALUES (%s, %s, %s)",
            (appointment_id, rating, comment or None)
        )
        conn.commit()
        return jsonify({"success": True}), 201
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


# ─────────────────────────────────────────────────────────
# ADMIN — aggregates only, never student-level records
# ─────────────────────────────────────────────────────────

@app.get("/api/admin/summary")
def admin_summary():
    user, err = require_admin()
    if err:
        return err

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
              COUNT(*) AS total_requests,
              COALESCE(SUM(status = 'pending'), 0) AS pending,
              COALESCE(SUM(status = 'scheduled'), 0) AS scheduled,
              COALESCE(SUM(status = 'completed'), 0) AS completed,
              COALESCE(SUM(status = 'cancelled'), 0) AS cancelled,
              COALESCE(SUM(urgency = 'urgent'), 0) AS urgent,
              COALESCE(SUM(urgency = 'high'), 0) AS high,
              COALESCE(SUM(urgency = 'normal'), 0) AS normal,
              COALESCE(SUM(urgency = 'urgent' AND acknowledged_at IS NULL
                           AND status NOT IN ('completed', 'cancelled')), 0) AS urgent_unacknowledged,
              COALESCE(SUM(follow_up_due IS NOT NULL AND follow_up_due < NOW()
                           AND status IN ('pending', 'scheduled')), 0) AS follow_ups_overdue,
              COALESCE(SUM(scheduled_for IS NOT NULL AND scheduled_for > NOW()
                           AND status = 'scheduled'), 0) AS upcoming_appointments
            FROM appointments
            """
        )
        counts = cursor.fetchone()
        for key, value in counts.items():
            counts[key] = int(value or 0)

        cursor.execute(
            """
            SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, acknowledged_at)), 1) AS avg_ack_minutes
            FROM appointments WHERE acknowledged_at IS NOT NULL
            """
        )
        avg_ack = cursor.fetchone()["avg_ack_minutes"]
        counts["avg_ack_minutes"] = float(avg_ack) if avg_ack is not None else None

        cursor.execute(
            "SELECT COUNT(*) AS count, ROUND(AVG(rating), 2) AS average FROM feedback"
        )
        feedback_row = cursor.fetchone()
        feedback_stats = {
            "count": int(feedback_row["count"] or 0),
            "average": float(feedback_row["average"]) if feedback_row["average"] is not None else None,
        }

        cursor.execute(
            """
            SELECT DATE(created_at) AS day, COUNT(*) AS count, ROUND(AVG(mood), 2) AS avg_mood
            FROM checkins
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
            GROUP BY DATE(created_at) ORDER BY day
            """
        )
        checkins = [
            {
                "day": row["day"].isoformat() if row["day"] else None,
                "count": int(row["count"] or 0),
                "avg_mood": float(row["avg_mood"]) if row["avg_mood"] is not None else None,
            }
            for row in cursor.fetchall()
        ]

        cursor.execute(
            """
            SELECT COUNT(*) AS total,
                   COALESCE(SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)), 0) AS last_7_days
            FROM messages
            """
        )
        message_row = cursor.fetchone()
        messages = {
            "total": int(message_row["total"] or 0),
            "last_7_days": int(message_row["last_7_days"] or 0),
        }

        return jsonify({
            "requests": counts,
            "feedback": feedback_stats,
            "checkins_last_14_days": checkins,
            "messages": messages,
        }), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.get("/api/admin/feedback")
def admin_feedback():
    user, err = require_admin()
    if err:
        return err

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, rating, comment, created_at FROM feedback
            ORDER BY created_at DESC LIMIT 30
            """
        )
        rows = cursor.fetchall()
        for row in rows:
            row["created_at"] = iso(row["created_at"])
        return jsonify({"count": len(rows), "entries": rows}), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


@app.get("/api/audit-log")
def get_audit_log():
    user, err = require_counsellor()
    if err:
        return err

    conn = get_connection()
    if not conn:
        return jsonify({"error": "Database unavailable."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT a.id, a.action, a.target_id, a.details, a.created_at,
                   COALESCE(u.email, 'system') AS performed_by
            FROM audit_log a
            LEFT JOIN users u ON u.id = a.user_id
            ORDER BY a.created_at DESC
            LIMIT 100
            """
        )
        rows = cursor.fetchall()
        for row in rows:
            if row["created_at"]:
                row["created_at"] = row["created_at"].isoformat()
        return jsonify({"count": len(rows), "entries": rows}), 200
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


if SERVE_CLIENT:
    @app.get("/<path:filename>")
    def client_files(filename):
        if os.path.isfile(os.path.join(CLIENT_DIST, filename)):
            return send_from_directory(CLIENT_DIST, filename)
        return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))