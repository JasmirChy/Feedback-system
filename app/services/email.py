import smtplib,random
from app.models.db import get_db_connection


def generate_unique_user_id(curser):
    while True:
        uid = random.randint(10 ** 8, 10 ** 9 - 1)
        curser.execute("select 1 from fd_user where user_id=%s", (uid,))
        if curser.fetchone() is None:
            return uid


def send_otp_email(to_email, otp):
    smtp = smtplib.SMTP_SSL(get_db_connection().SMTP_HOST, get_db_connection().SMTP_PORT)
    smtp.login(get_db_connection().SMTP_USER, get_db_connection().SMTP_PASS)
    message = f"""\
Subject: Your Verification Code

Your OTP is {otp}. It expires in 15 minutes."""
    smtp.sendmail(get_db_connection().SMTP_FROM, to_email, message)
    smtp.quit()
