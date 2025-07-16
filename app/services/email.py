# app/services/email.py
import smtplib,random
from flask import current_app

def generate_unique_user_id(curser):
    while True:
        uid = random.randint(10 ** 8, 10 ** 9 - 1)
        curser.execute("select 1 from fd_user where user_id=%s", (uid,))
        if curser.fetchone() is None:
            return uid


def send_otp_email(to_email, otp):
    cfg = current_app.config
    msg = (
        f"Subject: Your Verification Code\r\n"
        f"\r\n"
        f"Your OTP is {otp}. It expires in 15 minutes."
    )

    try:
        with smtplib.SMTP_SSL(cfg['SMTP_HOST'], cfg['SMTP_PORT']) as smtp:
            smtp.login(cfg['SMTP_USER'], cfg['SMTP_PASS'])
            smtp.sendmail(cfg['SMTP_FROM'], to_email, msg)
    except Exception as e:
        current_app.logger.warning(f"Could not send real email, OTP is {otp}: {e}")