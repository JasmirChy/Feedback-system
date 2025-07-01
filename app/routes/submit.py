
from werkzeug.utils import io, send_file
from flask import Blueprint, request, session, flash, redirect, url_for, render_template
from datetime import date
from app.models.db import get_db_connection

submit = Blueprint('submit', __name__)

@submit.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    title = request.form['title']
    body = request.form['details']
    category = request.form['category']
    user_id = session.get('user_id')  # assuming logged in
    hide = 1 if 'hideDetails' in request.form else 0

    if not user_id:
        flash("Please login first.", "warning")
        return redirect(url_for('auth.login'))  # or wherever your login route is

    if not (title and body and category):
        flash("Please fill all required fields.", "error")
        return redirect(url_for('views.user_dashboard', section='submitFeedback'))

    try:
        category = int(category)
    except ValueError:
        flash("Invalid category.", "error")
        return redirect(url_for('views.user_dashboard', section='submitFeedback'))

    conn = get_db_connection()
    cursor = conn.cursor()


    try:
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
        flash("Feedback submitted successfully!", "success")
    except Exception as e:
        conn.rollback()
        flash(f"An error occurred during submission: {e}", "error")
        return redirect(url_for('views.user_dashboard', section='submitFeedback'))
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('submit.user_history'))

@submit.route('/feedback_history')
def user_history():
    user_id = session.get('user_id')
    if not user_id:
        flash("Please login first.", "warning")
        return redirect(url_for('auth.login'))  # or wherever your login route is

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
      SELECT f.f_id, f.f_title AS title, f.f_body AS message,
             c.category AS category_name, f.f_date AS date, f.status, f.hide
        FROM feedback f
        JOIN category c ON c.category_id = f.category
       WHERE f.user_id = %s
       ORDER BY f.f_date DESC
    """, (user_id,))
    feedback_list = cursor.fetchall()

    cursor.execute("SELECT user_id, full_name, username, email, designation, dob FROM fd_user WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()

    cursor.execute("SELECT category_id, category FROM category")
    categories = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template('user_dashboard.html',
                           section='history',
                           feedback_list=feedback_list,
                           user=user,
                           categories=categories)


@submit.route('/feedback/<int:feedback_id>')
def feedback_detail(feedback_id):
    user_id = session.get('user_id')

    if not user_id:
        flash("Please login first.", "warning")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # fetch feedback
    cursor.execute("""
       SELECT f.f_id, f.f_title AS title, f.f_body AS message,
             c.category AS category, f.f_date AS date, f.status, f.hide
        FROM feedback f
        JOIN category c ON c.category_id = f.category
       WHERE f.f_id = %s AND f.user_id = %s
    """, (feedback_id, user_id))
    fb = cursor.fetchone()

    # fetch attachments
    cursor.execute("""
      SELECT attach_id, NULL AS filepath, NULL AS filename
        FROM attachment
       WHERE feedback_id = %s
    """, (feedback_id,))
    attachments = cursor.fetchall()

    cursor.execute("SELECT user_id, full_name FROM fd_user WHERE user_id = %s", (user_id,))
    user_data = cursor.fetchone()

    cursor.close()
    conn.close()

    if not fb:
        flash("Feedback not found or you don't have access.", "error")
        return redirect(url_for('submit.user_history'))

    return render_template('user_dashboard.html',
                           section='detail',
                           feedback=fb,
                           feedback_list=[],
                           attachments=attachments,
                           user=user_data)

@submit.route('/download_attachment/<int:attach_id>')
def download_attachment(attach_id):
    user_id = session.get('user_id')
    if not user_id:
        flash("Please login first.", "warning")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch attachment data and ensure the user owns the feedback associated with it
    # Added f.user_id check for security
    cursor.execute("""
        SELECT a.attach
        FROM attachment a
        JOIN feedback f ON a.feedback_id = f.f_id
        WHERE a.attach_id = %s AND f.user_id = %s
    """, (attach_id, user_id))
    attachment = cursor.fetchone()

    cursor.close()
    conn.close()

    if attachment and attachment['attach']:
        # Ideally, filename and content_type would be stored in the DB
        filename = f"attachment_{attach_id}.bin" # Generic filename
        mimetype = "application/octet-stream" # Generic mimetype

        return send_file(
            io.BytesIO(attachment['attach']),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename
        )
    else:
        flash("Attachment not found or you don't have access.", "error")
        return redirect(url_for('submit.user_history'))