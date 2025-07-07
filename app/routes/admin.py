import io
from flask import Blueprint, request, session, flash, redirect, url_for, render_template, send_file
from app.models.db import get_db_connection


admin = Blueprint('admin', __name__)

# ---------------- feedback detail ------------------
@admin.route('/feedback/<int:f_id>')
def feedback_detail(f_id):
    # --- Admin role check ---
    if 'user_id' not in session or session.get('role_id') != 1:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # --- Get current admin user info ---
    cursor.execute("SELECT * FROM fd_user WHERE user_id = %s", (session['user_id'],))
    user = cursor.fetchone()

    # Get all feedbacks (for the table) -- needed to render full dashboard
    cursor.execute("""
        SELECT f.f_id, f.f_title, u.full_name AS submitter_name, c.category AS category_name,
               f.status,f.hide, f.f_date AS date, f.f_body
        FROM feedback f
        LEFT JOIN fd_user u ON f.user_id = u.user_id
        LEFT JOIN category c ON f.category = c.category_id
        ORDER BY f.f_date DESC
    """)
    feedbacks = cursor.fetchall()


    # Replace names for hidden feedbacks
    for fb in feedbacks:
        if fb['hide'] == 1:
            fb['submitter_name'] = 'Anonymous'
        # format date like YYYY-MM-DD
        d = fb.get('f_date')
        if d:
            fb['f_date'] = d.strftime('%Y-%m-%d') if not isinstance(d, str) else d[:10]


    # Fetch selected feedback detail
    cursor.execute("""
           SELECT f.f_id, f.f_title AS title, c.category AS category, f.status, f.f_date AS date, f.f_body AS message, f.hide,u.full_name AS submitter_name
           FROM feedback f
           LEFT JOIN category c ON f.category = c.category_id
           LEFT JOIN fd_user u ON f.user_id = u.user_id
           WHERE f.f_id = %s
       """, (f_id,))
    selected = cursor.fetchone()

    if selected and selected['hide'] == 1:
        selected['submitter_name'] = 'Anonymous'

    # Fetch attachments if you have that table and route
    cursor.execute("SELECT attach_id, filename FROM attachments WHERE f_id = %s", (f_id,))
    attachments = cursor.fetchall()

    cursor.close()
    conn.close()

    if not selected:
        flash("Feedback not found.", "error")
        return redirect(url_for('admin.admin_dashboard'))

    # --- Render admin_dashboard.html with feedback detail ---
    return render_template(
        'admin_dashboard.html',
        section='feedbackDetail',
        user=user,
        feedbacks=feedbacks,
        feedback=selected,
        attachments=attachments
    )


@admin.route('/attachments/<int:attach_id>')
def admin_download_attachment(attach_id):
    if 'user_id' not in session or session.get('role_id') != 1:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT filename, file_data FROM attachments WHERE attach_id = %s", (attach_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row or not row['file_data']:
        flash("Attachment not found or file is empty.", "error")
        return redirect(url_for('views.admin_dashboard'))

    file_stream = io.BytesIO(row['file_data'])
    return send_file(
        file_stream,
        as_attachment=True,
        download_name=row['filename'],
        mimetype='application/octet-stream'  # or a better guess based on extension
    )


@admin.route('/update-status', methods=['POST'])
def update_status():
    # --- guard ---
    if 'user_id' not in session or session.get('role_id') != 1:
        flash('Access denied.', 'error')
        return redirect(url_for('auth.login')), 403

    f_id   = request.form.get('f_id')
    status = request.form.get('status')

    if not (f_id and status in {'1','2','3'}):
        flash('Invalid feedback ID or status.', 'error')
        return redirect(url_for('views.admin_dashboard')), 400

    conn   = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE feedback SET status = %s WHERE f_id = %s",
            (status, f_id)
        )
        conn.commit()
        flash('Feedback status updated.', 'success')
    except Exception as e:
        conn.rollback()
        flash(f'Could not update status: {e}', 'error')
    finally:
        cursor.close()
        conn.close()

    # redirect back to the dashboard, preserving any `?section=` if you like
    return redirect(url_for('views.admin_dashboard'))



# ---------------- View Users ------------------
@admin.route('/view-users')
def view_users():
    if 'user_id' not in session or session.get('role') != 1:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Join admin_requests with fd_user to get the current role
    cursor.execute("""
        SELECT ar.id, ar.user_id, ar.username, ar.status, ar.role_id AS requested_role,
               u.role_id AS current_role
        FROM admin_requests ar
        JOIN fd_user u ON ar.user_id = u.user_id
        WHERE ar.status = 'Pending'
        ORDER BY ar.id DESC
    """)
    user_requests = cursor.fetchall()

    cursor.execute("SELECT * FROM fd_user WHERE user_id = %s", (session['user_id'],))
    admin_user = cursor.fetchone()

    conn.close()


    return render_template(
        'admin_dashboard.html',
        section='viewUsers',
        user=admin_user,
        user_requests=user_requests
    )



# ---------------- Update User Role ------------------
@admin.route('/approve-admin-request', methods=['POST'])
def approve_admin_request():
    if 'user_id' not in session or session.get('role') != 1:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    user_id = request.form.get('user_id')
    new_role_id = request.form.get('new_role_id')

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Update fd_user role_id
        cursor.execute("UPDATE fd_user SET role_id = %s WHERE user_id = %s", (new_role_id, user_id))

        # 2. Mark admin_requests as approved
        cursor.execute("UPDATE admin_requests SET status = 'Approved' WHERE user_id = %s AND status = 'Pending'",
                       (user_id,))

        conn.commit()
        flash("User role updated to Admin successfully.", "success")
    except Exception as e:
        conn.rollback()
        flash(f"Failed to update role: {e}", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('admin.view_users'))
