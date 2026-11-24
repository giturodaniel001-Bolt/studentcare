"""
Create an administrator account for aggregate reporting.

Usage:  python seed_admin.py
"""
from werkzeug.security import generate_password_hash
from db import get_connection

ADMIN_EMAIL = "admin@studentcare.test"
ADMIN_PASSWORD = "AdminPass123!"  # change in real deployments


def main():
    conn = get_connection()
    if not conn:
        print("Could not connect to database.")
        return

    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (ADMIN_EMAIL,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("UPDATE users SET role = 'admin' WHERE id = %s", (existing["id"],))
        conn.commit()
        print(f"Administrator already exists (id={existing['id']}); role ensured.")
    else:
        cursor.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, 'admin')",
            (ADMIN_EMAIL, generate_password_hash(ADMIN_PASSWORD))
        )
        conn.commit()
        print(f"Administrator created: {ADMIN_EMAIL}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print("   Change this password in production.")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
