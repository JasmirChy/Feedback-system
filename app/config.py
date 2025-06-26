# app/config.py

MYSQL = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'feedback_system',
    'autocommit': True
}

SECRET_KEY = 'a7agendas9822897g2rgf2873299sdist'
SESSION_TYPE = 'filesystem'
SESSION_PERMANENT = False
PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 7  # one week


# ← NEW SMTP SETTINGS ↓
SMTP_HOST = 'smtp.gmail.com'
SMTP_PORT = 465
SMTP_USER = 'nabinbhatt141@gmail.com'
SMTP_PASS = 'zrfr najf appv zihz'
SMTP_FROM = 'no-reply@gmail.com'