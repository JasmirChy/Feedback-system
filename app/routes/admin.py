from flask import Blueprint, request, session, flash, redirect, url_for, render_template, abort, jsonify
from werkzeug.security import generate_password_hash
from app.models.db import get_db_connection  # Adjust import as needed


# Admin blueprint handles sub-routes only (feedback detail, resolve, user add, reports)
admin = Blueprint('admin', __name__)

@admin.route('/feedback/<int:f_id>')
def feedback_detail(f_id):
    # --- Admin role check ---
    if 'user_id' not in session or session.get('role') != 'admin':
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # --- Get current admin user info ---
    cursor.execute("SELECT * FROM fd_user WHERE user_id = %s", (session['user_id'],))
    user = cursor.fetchone()

    # --- Get ALL feedbacks for the left table ---
    cursor.execute("""
        SELECT f.f_id, f.f_title, f.f_body, f.f_date, f.status, f.hide,
               c.category AS category_name,
               u.full_name AS submitter_name
        FROM feedback f
        JOIN category c ON f.category = c.category_id
        JOIN fd_user u ON f.user_id = u.user_id
        ORDER BY f.f_date DESC
    """)
    feedbacks = cursor.fetchall()

    # Replace names for hidden feedbacks
    for fb in feedbacks:
        if fb['hide'] == 1:
            fb['submitter_name'] = 'Anonymous'

    # --- Get the selected feedback by ID ---
    cursor.execute("""
        SELECT f.f_id, f.f_title, f.f_body, f.f_date, f.status, f.hide,
               c.category AS category_name,
               u.full_name AS submitter_name
        FROM feedback f
        JOIN category c ON f.category = c.category_id
        JOIN fd_user u ON f.user_id = u.user_id
        WHERE f.f_id = %s
    """, (f_id,))
    selected = cursor.fetchone()

    if selected and selected['hide'] == 1:
        selected['submitter_name'] = 'Anonymous'

    conn.close()

    # --- Render admin_dashboard.html with feedback detail ---
    return render_template(
        'admin_dashboard.html',
        section='feedbackDetails',
        user=user,
        feedbacks=feedbacks,
        selected_feedback=selected
    )
