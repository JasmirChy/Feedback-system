# app/routes/submit.py
import io
import os
from datetime import datetime
from flask import Blueprint, request, session, flash, redirect, url_for, render_template, send_file
from werkzeug.utils import secure_filename
from app.models import get_db_connection
from app.routes.auth import role_required, USER_ROLE_ID

submit = Blueprint('submit', __name__)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return '.' in filename and ext in ALLOWED_EXTENSIONS


@submit.route('/submit_feedback', methods=['POST'])
@role_required(USER_ROLE_ID)
def submit_feedback():

    if request.method == 'GET':
        return redirect(url_for('views.user_dashboard', section='submitFeedback'))

    # 2) Grab and validate form data
    title = request.form.get('title', '').strip()
    body = request.form.get('details', '').strip()
    category = request.form.get('category')
    hide = bool(request.form.get('hideDetails'))
    user_id = session['user_id']


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
        # 3) Insert the feedback
        cursor.execute("""
                    INSERT INTO feedback
                        (f_title, f_body, category, user_id, f_date, status, hide)
                    VALUES (%s, %s, %s, %s, %s, 1, %s)
                """, (title, body, category, user_id, datetime.utcnow(), int(hide)))
        feedback_id = cursor.lastrowid


        # 4) Process attachments
        files = request.files.getlist('attachment[]')
        max_file_size = 5 * 1024 * 1024  # 5 MB file limit
        for f in files:
            if f:
                f.seek(0, os.SEEK_END)
                size = f.tell()
                f.seek(0)
                if size > max_file_size:
                    raise ValueError("Attachment too large")
        for f in files:
            if f and allowed_file(f.filename):
                original = secure_filename(f.filename)
                file_data = f.read()

                cursor.execute("""
                    INSERT INTO attachments (f_id, filename, file_data)
                    VALUES (%s, %s, %s)
                """, (feedback_id, original, file_data))

        conn.commit()
        flash("Your feedback has been submitted successfully!", "success")

    except Exception as e:
        conn.rollback()
        flash(f"An error occurred during submission: {e}", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.user_dashboard', section='history'))


@submit.route('/feedback_history')
@role_required(USER_ROLE_ID)
def user_history():

    user_id = session.get('user_id')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
          SELECT f.f_id, f.f_title, f.f_body, c.category AS category_name, f.f_date AS date, f.status, f.hide
            FROM feedback f
            JOIN category c ON c.category_id = f.category
           WHERE f.user_id = %s
           ORDER BY f.f_date DESC, f.f_id DESC 
        """, (user_id,))
    feedback_list = cursor.fetchall()

    # ── Format every date to "YYYY‑MM‑DD" ──
    for fb in feedback_list:
        d = fb.get('date')
        if d:
            fb['date'] = d.strftime('%Y-%m-%d') if not isinstance(d, str) else d[:10]
        else:
            fb['date'] = None

    cursor.execute("SELECT user_id, full_name, username, email, designation, dob FROM fd_user WHERE user_id = %s",(user_id,))
    user = cursor.fetchone()

    # Convert dob to string
    if user and user['dob']:
        if not isinstance(user['dob'], str):
            user['dob'] = user['dob'].strftime('%Y-%m-%d')

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
@role_required(USER_ROLE_ID)
def feedback_detail(feedback_id):

    user_id = session.get('user_id')

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

    if not fb:
        cursor.close()
        conn.close()
        flash("Feedback not found or access denied.", "error")
        return redirect(url_for('submit.user_history'))

    # ── Format that one date too ──
    d = fb.get('date')
    if d:
        fb['date'] = d.strftime('%Y-%m-%d') if not isinstance(d, str) else d[:10]
    else:
        fb['date'] = None

    # fetch attachments
    cursor.execute("""
            SELECT attach_id, filename
              FROM attachments
             WHERE f_id = %s
        """, (feedback_id,))
    attachments = cursor.fetchall()

    cursor.execute("""
            SELECT user_id, full_name, username, email, designation, dob
              FROM fd_user
             WHERE user_id = %s
        """, (user_id,))
    user = cursor.fetchone()

    if user and user['dob'] and not isinstance(user['dob'], str):
        user['dob'] = user['dob'].strftime('%Y-%m-%d')

    # Also load feedback history and categories for other sections
    cursor.execute("""
      SELECT f.f_id, f.f_title AS title, f.f_body AS message,
             c.category AS category_name, f.f_date AS date, f.status, f.hide
        FROM feedback f
        JOIN category c ON c.category_id = f.category
       WHERE f.user_id = %s
    """, (user_id,))
    feedback_list = cursor.fetchall()

    # ── And format those dates too ──
    for fb2 in feedback_list:
        d2 = fb2.get('date')
        if d2:
            fb2['date'] = d2.strftime('%Y-%m-%d') if not isinstance(d2, str) else d2[:10]
        else:
            fb2['date'] = None

    cursor.execute("SELECT category_id, category FROM category")
    categories = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template('user_dashboard.html',
                           section='feedbackDetail',
                           feedback=fb,
                           attachments=attachments,
                           feedback_list=feedback_list,
                           categories=categories,
                           user=user)

@submit.route('/download_attachment/<int:attach_id>')
@role_required(USER_ROLE_ID)
def download_attachment(attach_id):

    user_id = session.get('user_id')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Fetch the attachment file data and filename only if it belongs to the user's feedback
    cursor.execute("""
            SELECT a.filename, a.file_data
              FROM attachments a
              JOIN feedback f ON a.f_id = f.f_id
             WHERE a.attach_id = %s AND f.user_id = %s
        """, (attach_id, user_id))
    attachment_info = cursor.fetchone()

    cursor.close()
    conn.close()

    if attachment_info and attachment_info['file_data']:
        file_bytes = attachment_info['file_data']
        filename = attachment_info['filename']

        # Create an in-memory binary stream
        return send_file(
            io.BytesIO(file_bytes),
            as_attachment=True,
            download_name=filename,
            mimetype='application/octet-stream'
        )
    else:
        flash("Attachment not found or access denied.", "error")
        return redirect(url_for('submit.user_history'))
