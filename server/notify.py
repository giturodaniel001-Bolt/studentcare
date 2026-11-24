"""Optional email alerts for the counselling team.

Alerts are sent only when SMTP settings are present in the environment; the
dashboard is always the primary notification surface. Alert emails never
include the student's email address.
"""
import os
import smtplib
import threading
from email.message import EmailMessage

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "studentcare@localhost").strip()
ALERT_TO = os.getenv("ALERT_TO", "").strip()
ALERT_TO_BACKUP = os.getenv("ALERT_TO_BACKUP", "").strip()
APP_BASE_URL = os.getenv("APP_BASE_URL", "").strip().rstrip("/")


def email_alerts_enabled():
    return bool(SMTP_HOST and ALERT_TO)


def _deliver(recipient, subject, body):
    try:
        message = EmailMessage()
        message["From"] = SMTP_FROM
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            if SMTP_PORT != 25:
                smtp.starttls()
            if SMTP_USER:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(message)
    except Exception as exc:  # never let notification failures break a request
        print(f"[notify] email delivery failed: {exc}")


def _deliver_async(recipient, subject, body):
    if not email_alerts_enabled() or not recipient:
        return
    threading.Thread(
        target=_deliver, args=(recipient, subject, body), daemon=True
    ).start()


def notify_new_request(urgency, tracking_code):
    if urgency == "urgent":
        subject = "[StudentCare] URGENT counselling request"
        lead = "A student has requested immediate support."
    elif urgency == "high":
        subject = "[StudentCare] High-priority counselling request"
        lead = "A student has requested support soon."
    else:
        subject = "[StudentCare] New counselling request"
        lead = "A new counselling request has arrived."

    body = (
        f"{lead}\n\n"
        f"Tracking code: {tracking_code}\n"
        f"Priority: {urgency}\n\n"
        "Open the counsellor dashboard to review and acknowledge the request.\n"
        "Urgent requests that are not acknowledged are escalated automatically.\n"
        f"{APP_BASE_URL}\n"
    )
    _deliver_async(ALERT_TO, subject, body)


def notify_escalation(tracking_code, minutes_waiting):
    recipient = ALERT_TO_BACKUP or ALERT_TO
    subject = "[StudentCare] Escalation: urgent request still unacknowledged"
    body = (
        "An urgent counselling request has not been acknowledged in the dashboard.\n\n"
        f"Tracking code: {tracking_code}\n"
        f"Waiting: {minutes_waiting} minutes\n\n"
        "A backup counsellor should review this request as soon as possible.\n"
        f"{APP_BASE_URL}\n"
    )
    _deliver_async(recipient, subject, body)
