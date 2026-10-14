import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load variables from .env into the environment
load_dotenv()


def get_connection():
    """Create and return a MySQL connection using .env credentials."""
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
        )
        return connection
    except Error as e:
        print(f"[db.py] MySQL connection error: {e}")
        return None


def test_connection():
    """Return True if MySQL is reachable, False otherwise."""
    conn = get_connection()
    if conn and conn.is_connected():
        conn.close()
        return True
    return False