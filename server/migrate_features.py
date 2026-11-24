"""
Add priority workflow and student engagement features. Safe to re-run.

Usage:  python migrate_features.py
"""
import sys

from db import get_connection

NEW_APPOINTMENT_COLUMNS = [
    ("urgency", "ALTER TABLE appointments ADD COLUMN urgency ENUM('urgent','high','normal') NOT NULL DEFAULT 'normal' AFTER preferred_contact"),
    ("acknowledged_at", "ALTER TABLE appointments ADD COLUMN acknowledged_at DATETIME NULL AFTER status"),
    ("acknowledged_by", "ALTER TABLE appointments ADD COLUMN acknowledged_by INT NULL AFTER acknowledged_at"),
    ("escalated_at", "ALTER TABLE appointments ADD COLUMN escalated_at DATETIME NULL AFTER acknowledged_by"),
    ("follow_up_due", "ALTER TABLE appointments ADD COLUMN follow_up_due DATETIME NULL AFTER escalated_at"),
    ("scheduled_for", "ALTER TABLE appointments ADD COLUMN scheduled_for DATETIME NULL AFTER follow_up_due"),
]

NEW_TABLES = [
    (
        "messages",
        """
        CREATE TABLE IF NOT EXISTS messages (
          id INT NOT NULL AUTO_INCREMENT,
          appointment_id INT NOT NULL,
          sender ENUM('student','counsellor') NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY appointment_id (appointment_id),
          CONSTRAINT messages_appointment_fk FOREIGN KEY (appointment_id)
            REFERENCES appointments (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
    ),
    (
        "checkins",
        """
        CREATE TABLE IF NOT EXISTS checkins (
          id INT NOT NULL AUTO_INCREMENT,
          appointment_id INT NULL,
          mood TINYINT NOT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY appointment_id (appointment_id),
          KEY created_at (created_at),
          CONSTRAINT checkins_appointment_fk FOREIGN KEY (appointment_id)
            REFERENCES appointments (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
    ),
    (
        "feedback",
        """
        CREATE TABLE IF NOT EXISTS feedback (
          id INT NOT NULL AUTO_INCREMENT,
          appointment_id INT NULL,
          rating TINYINT NOT NULL,
          comment VARCHAR(500) NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY appointment_id (appointment_id),
          CONSTRAINT feedback_appointment_fk FOREIGN KEY (appointment_id)
            REFERENCES appointments (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
    ),
]


def column_exists(cursor, table, column):
    cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (table, column),
    )
    return cursor.fetchone()[0] > 0


def table_exists(cursor, table):
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s",
        (table,),
    )
    return cursor.fetchone()[0] > 0


def constraint_exists(cursor, table, name):
    cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND CONSTRAINT_NAME = %s
        """,
        (table, name),
    )
    return cursor.fetchone()[0] > 0


def main():
    conn = get_connection()
    if not conn:
        print("Could not connect to the database.")
        sys.exit(1)

    cursor = conn.cursor()
    changed = []

    cursor.execute(
        "SELECT COLUMN_TYPE FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
    )
    role_type = (cursor.fetchone() or [""])[0]
    if "admin" not in role_type:
        cursor.execute(
            "ALTER TABLE users MODIFY COLUMN role ENUM('student','counsellor','admin') "
            "NOT NULL DEFAULT 'student'"
        )
        changed.append("users.role accepts admin")

    for column, ddl in NEW_APPOINTMENT_COLUMNS:
        if not column_exists(cursor, "appointments", column):
            cursor.execute(ddl)
            changed.append(f"appointments.{column}")

    if not constraint_exists(cursor, "appointments", "appointments_ack_user_fk"):
        cursor.execute(
            "ALTER TABLE appointments ADD CONSTRAINT appointments_ack_user_fk "
            "FOREIGN KEY (acknowledged_by) REFERENCES users (id) ON DELETE SET NULL"
        )
        changed.append("appointments.acknowledged_by foreign key")

    cursor.execute(
        "SELECT IS_NULLABLE FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_log' AND COLUMN_NAME = 'user_id'"
    )
    row = cursor.fetchone()
    if row and row[0] == "NO":
        cursor.execute("ALTER TABLE audit_log MODIFY COLUMN user_id INT NULL")
        changed.append("audit_log.user_id nullable (system events)")

    for name, ddl in NEW_TABLES:
        if not table_exists(cursor, name):
            cursor.execute(ddl)
            changed.append(f"table {name}")

    cursor.execute(
        """
        UPDATE appointments
        SET follow_up_due = CASE urgency
              WHEN 'urgent' THEN DATE_ADD(created_at, INTERVAL 1 HOUR)
              WHEN 'high' THEN DATE_ADD(created_at, INTERVAL 24 HOUR)
              ELSE DATE_ADD(created_at, INTERVAL 48 HOUR)
            END
        WHERE follow_up_due IS NULL
        """
    )
    if cursor.rowcount:
        changed.append(f"{cursor.rowcount} follow-up deadlines backfilled")

    conn.commit()
    cursor.close()
    conn.close()

    if changed:
        print("Applied:")
        for item in changed:
            print(f"  - {item}")
    else:
        print("Schema already up to date.")


if __name__ == "__main__":
    main()
