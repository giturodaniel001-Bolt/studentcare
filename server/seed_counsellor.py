"""
Run once to create a test counsellor account.
Usage:  python seed_counsellor.py
"""
from werkzeug.security import generate_password_hash
from db import get_connection

COUNSELLOR_EMAIL = "counsellor@studentcare.test"
COUNSELLOR_PASSWORD = "CounsellorPass123!"  # change in real deployments


def main():
    conn = get_connection()
    if not conn:
        print("❌ Could not connect to database.")
        return

    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id FROM users WHERE email = %s", (COUNSELLOR_EMAIL,))
    existing = cursor.fetchone()

    if existing:
        print(f"ℹ️  Counsellor already exists (id={existing['id']}).")
    else:
        password_hash = generate_password_hash(COUNSELLOR_PASSWORD)
        cursor.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, 'counsellor')",
            (COUNSELLOR_EMAIL, password_hash)
        )
        conn.commit()
        print(f"✅ Counsellor created: {COUNSELLOR_EMAIL}")
        print(f"   Password: {COUNSELLOR_PASSWORD}")
        print("   ⚠️  Change this password in production.")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()