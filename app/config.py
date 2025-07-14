# app/config.py
import os

MYSQL = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASS', ''),
    'database': os.getenv('MYSQL_DB', 'feedback_system'),
    'autocommit': True
}

SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'a7agendas9822897g2rgf2873299sdist')
SESSION_TYPE = 'filesystem'
SESSION_PERMANENT = False
PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 7  # one week


# ← NEW SMTP SETTINGS ↓
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 465))
try:
    SMTP_USER = os.getenv('SMTP_USER', 'nabinbhatt141@gmail.com')
    SMTP_PASS = os.getenv('SMTP_PASS', 'zrfr najf appv zihz')
    SMTP_FROM = os.getenv('SMTP_FROM', 'nabinbhatt141@gmail.com')
except KeyError as e:
    raise RuntimeError(f"Missing required SMTP environment variable: {e}") from e
