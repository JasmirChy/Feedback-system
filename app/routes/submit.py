from flask import Blueprint, request, session, flash, redirect, url_for
from datetime import date
from app.models.db import get_db_connection

submit = Blueprint('submit', __name__)

@submit.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    title = request.form['title']
    body = request.form['details']
    category = int(request.form['category'])
    user_id = session.get('user_id')  # assuming logged in
    hide = 1 if 'hideDetails' in request.form else 0

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1) insert the feedback row
    cursor.execute("""INSERT INTO feedback (f_title, f_body, category, user_id, f_date, status, hide) VALUES (%s, %s, %s, %s, %s, %s, %s)""", (title, body, category, user_id, date.today(), 1, hide))
    # get the auto‐generated f_id
    feedback_id = cursor.lastrowid

    # 2) handle attachments (if any)
    files = request.files.getlist('attachment')
    for f in files:
        blob = f.read()  # read the bytes
        # skip empty uploads
        if not blob:
            continue
        cursor.execute(
            "INSERT INTO attachment (attach, feedback_id) VALUES (%s, %s)",
            (blob, feedback_id)
        )

    conn.commit()
    cursor.close()
    conn.close()

    flash("Feedback submitted successfully!", "success")
    return redirect(url_for('submit.user_history'))

@submit.route('/feedback_history')
def user_history():
    return redirect(url_for('views.user_dashboard'))