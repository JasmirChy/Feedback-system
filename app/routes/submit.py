import os
from datetime import date, datetime

from flask import Blueprint, request, session, flash, redirect, url_for, render_template, send_from_directory, current_app
from werkzeug.utils import secure_filename

from app.models.db import get_db_connection

submit = Blueprint('submit', __name__)

UPLOAD_FOLDER = 'app/static/uploads/attachments' # <--- This line defines it
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return '.' in filename and ext in ALLOWED_EXTENSIONS


@submit.route('/submit_feedback', methods=['POST'])
def submit_feedback():

    if 'user_id' not in session:
        flash("Please login first.", "warning")
        return redirect(url_for('auth.login'))  # or wherever your login route is

    if request.method == 'GET':
        # Render the same dashboard template but open the Submit section
        # Assumes you pass in categories and user info as in history
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
                """, (title, body, category, user_id, date.today(), int(hide)))
        feedback_id = cursor.lastrowid

        # Prepare an absolute upload folder path
        upload_folder_abs = os.path.join(current_app.root_path, UPLOAD_FOLDER)
        os.makedirs(upload_folder_abs, exist_ok=True)

        # 4) Process attachments
        files = request.files.getlist('attachment[]')
        print("FILES RECEIVED:", files)
        for f in files:
            if f and allowed_file(f.filename):
                original = secure_filename(f.filename)
                unique = f"{feedback_id}_{original}"
                path = os.path.join(upload_folder_abs, unique)
                f.save(path)

                # Store a relative path from 'app/static' folder for serving
                relative_path = os.path.relpath(path, start=os.path.join(current_app.root_path, 'app', 'static')).replace('\\', '/')

                cursor.execute("""
                                    INSERT INTO attachments (f_id, attachment_path, filename)
                                    VALUES (%s, %s, %s)
                                """, (feedback_id, relative_path, original))

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
def user_history():
    user_id = session.get('user_id')
    if not user_id:
        flash("Please login first.", "warning")
        return redirect(url_for('auth.login'))  # or wherever your login route is

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
          SELECT f.f_id, f.f_title, f.f_body, c.category AS category_name, f.f_date AS date, f.status, f.hide
            FROM feedback f
            JOIN category c ON c.category_id = f.category
           WHERE f.user_id = %s
           ORDER BY f.f_date DESC
        """, (user_id,))
    feedback_list = cursor.fetchall()

    # 🛠 Convert `date` string to a datetime object
    for fb in feedback_list:
        if fb['date'] and not isinstance(fb['date'], str):
            fb['date'] = fb['date'].strftime('%Y-%m-%d')

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

    if not fb:
        cursor.close()
        conn.close()
        flash("Feedback not found or access denied.", "error")
        return redirect(url_for('submit.user_history'))

    # fetch attachments
    cursor.execute("""
            SELECT attach_id, attachment_path, filename
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
def download_attachment(attach_id):
    user_id = session.get('user_id')
    if not user_id:
        flash("Please login first.", "warning")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
            SELECT a.attachment_path, a.filename
              FROM attachments a
              JOIN feedback f ON a.f_id = f.f_id
             WHERE a.attach_id = %s AND f.user_id = %s
        """, (attach_id, user_id))
    attachment_info = cursor.fetchone()

    cursor.close()
    conn.close()

    if attachment_info:
        file_relative_path = attachment_info['attachment_path']
        original_filename = attachment_info['filename']

        # Ensure the file exists on the filesystem
        file_full_path = os.path.join(current_app.root_path, 'app', 'static', file_relative_path)

        if os.path.exists(file_full_path):
            # `send_from_directory` expects the directory and the filename separately
            directory = os.path.dirname(file_full_path)
            filename_to_serve = os.path.basename(file_full_path)
            return send_from_directory(directory, filename_to_serve, as_attachment=True, download_name=original_filename)

        else:
            flash("Attachment file not found on server.", "error")
            return redirect(url_for('submit.user_history'))
    else:
        flash("Attachment record not found or you don't have access.", "error")
        return redirect(url_for('submit.user_history'))
