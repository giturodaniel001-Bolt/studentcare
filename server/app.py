import os
import random
import string
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_session import Session
from dotenv import load_dotenv
from mysql.connector import Error
from werkzeug.security import check_password_hash

from db import get_connection, test_connection

load_dotenv()

app = Flask(__name__)

# ─── Sessions & CORS ───
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
Session(app)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False   # True only with HTTPS in production
app.config["SESSION_COOKIE_HTTPONLY"] = True

CORS(app, supports_credentials=True, origins=["http://localhost:5173"])


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
    if not user:
        return None, (jsonify({"error": "Counsellor authentication required."}), 401)
    return user, None


# ─────────────────────────────────────────────────────────
# Health & Root
# ─────────────────────────────────────────────────────────

@app.get("/")
def home():
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

        if user["role"] != "counsellor":
            return jsonify({"error": "This portal is for counsellors only."}), 403

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
    user = current_counsellor()
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

    if not email or "@" not in email:
        return jsonify({"error": "A valid email is required."}), 400
    if preferred_contact not in ("email", "phone", "in-person"):
        return jsonify({
            "error": "preferred_contact must be one of: email, phone, in-person."
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
            INSERT INTO appointments (tracking_code, student_id, preferred_contact, status)
            VALUES (%s, %s, %s, 'pending')
            """,
            (tracking_code, student_id, preferred_contact)
        )
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Appointment request received.",
            "tracking_code": tracking_code,
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
            SELECT tracking_code, preferred_contact, status, created_at, updated_at
            FROM appointments WHERE tracking_code = %s
            """,
            (tracking_code,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "No appointment found for that code."}), 404

        if row.get("created_at"):
            row["created_at"] = row["created_at"].isoformat()
        if row.get("updated_at"):
            row["updated_at"] = row["updated_at"].isoformat()

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
        cursor.execute(
            """
            SELECT id, tracking_code, preferred_contact, status, created_at, updated_at
            FROM appointments
            ORDER BY
              CASE status WHEN 'pending' THEN 0 WHEN 'scheduled' THEN 1
                          WHEN 'completed' THEN 2 ELSE 3 END,
              created_at DESC
            """
        )
        rows = cursor.fetchall()

        log_action(user["id"], "view_all_appointments", None, f"count={len(rows)}")

        for row in rows:
            if row["created_at"]:
                row["created_at"] = row["created_at"].isoformat()
            if row["updated_at"]:
                row["updated_at"] = row["updated_at"].isoformat()

        return jsonify({"count": len(rows), "appointments": rows}), 200
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
                   u.email AS performed_by
            FROM audit_log a
            JOIN users u ON u.id = a.user_id
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)