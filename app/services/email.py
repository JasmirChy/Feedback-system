import smtplib
from app.models.db import get_db_connection

def send_otp_email(to_email, otp):
    smtp = smtplib.SMTP_SSL(get_db_connection().SMTP_HOST, get_db_connection().SMTP_PORT)
    smtp.login(get_db_connection().SMTP_USER, get_db_connection().SMTP_PASS)
    message = f"""\
Subject: Your Verification Code

Your OTP is {otp}. It expires in 15 minutes."""
    smtp.sendmail(get_db_connection().SMTP_FROM, to_email, message)
    smtp.quit()
