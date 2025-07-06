from flask import Blueprint, render_template, url_for, session, flash, redirect, request
from app.models.db import get_db_connection

views = Blueprint('views', __name__)

@views.route('/')
def index():
    return render_template('index.html')

@views.route('/user')
def user_dashboard():
    user_id = session.get('user_id')
    if not user_id:
        flash('Please log in first','error')
        return redirect(url_for('auth.login'))

    section = request.args.get('section', 'home')

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)

    # fetch the logged‐in user’s profile
    cur.execute("""
           SELECT user_id, full_name, username, email, designation, dob
           FROM fd_user
           WHERE user_id = %s
       """, (user_id,))
    user = cur.fetchone()

    # fetch their feedback submissions
    cur.execute("""
           SELECT
             f.f_id, f.f_title, f.f_body,
             c.category AS category_name,
             f.f_date As date, f.status, f.hide
           FROM feedback AS f
           JOIN category AS c
             ON f.category = c.category_id
           WHERE f.user_id = %s
           ORDER BY f.f_date DESC
       """, (user_id,))
    feedback_list = cur.fetchall()

    # ── HERE: turn every `date` into "YYYY‑MM‑DD" string ──
    for fb in feedback_list:
        d = fb.get('date')
        if d:
            # if it's a date object
            fb['date'] = d.strftime('%Y-%m-%d') if not isinstance(d, str) else d[:10]
        else:
            # explicitly None so template will render 'N/A'
            fb['date'] = None

    # fetch a category list
    cur.execute("""SELECT category_id, category FROM category""")
    categories = cur.fetchall()

    cur.close()
    conn.close()

    return render_template('user_dashboard.html',
                           section=section,
                           user = user,
                           feedback_list = feedback_list,
                           categories = categories)

@views.route('/admin')
def admin_dashboard():

    if 'user_id' not in session or session.get('role_id') != 1:
        flash('Access denied.', 'error')
        return redirect(url_for('auth.login'))

    section = request.args.get('section', 'home')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Get admin user
    cursor.execute("SELECT * FROM fd_user WHERE user_id = %s", (session['user_id'],))
    user = cursor.fetchone()

    # Get all feedbacks
    cursor.execute("""
        SELECT f.f_id, f.f_title, f.f_body, f.f_date, f.status,
               f.hide, c.category AS category_name,
               u.full_name AS submitter_name
        FROM feedback f
        JOIN category c ON f.category = c.category_id
        JOIN fd_user u ON f.user_id = u.user_id
        ORDER BY f.f_date DESC
    """)
    feedbacks = cursor.fetchall()

    # Hide name if anonymous
    for fb in feedbacks:
        if fb['hide'] == 1:
            fb['submitter_name'] = 'Anonymous'

    conn.close()

    return render_template("admin_dashboard.html",
                           user=user,
                           feedbacks=feedbacks,
                           section=section)
