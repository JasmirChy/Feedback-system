from flask import Blueprint, request, session, flash, redirect, url_for, render_template
from app.models.db import get_db_connection  # Adjust import as needed


# Admin blueprint handles sub-routes only (feedback detail, resolve, user add, reports)
admin = Blueprint('admin', __name__)

# ---------------- feedback detail ------------------
@admin.route('/feedback/<int:f_id>')
def feedback_detail(f_id):
    # --- Admin role check ---
    if 'user_id' not in session or session.get('role') != 1:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # --- Get current admin user info ---
    cursor.execute("SELECT * FROM fd_user WHERE user_id = %s", (session['user_id'],))
    user = cursor.fetchone()

    # Get all feedbacks (for the table) -- needed to render full dashboard
    cursor.execute("""
        SELECT f.f_id, f.f_title, u.full_name AS submitter_name, c.category_name,
               f.status, f.f_date, f.f_body
        FROM feedbacks f
        LEFT JOIN fd_user u ON f.user_id = u.user_id
        LEFT JOIN categories c ON f.category_id = c.category_id
        ORDER BY f.f_date DESC
    """)
    feedbacks = cursor.fetchall()


    # Replace names for hidden feedbacks
    for fb in feedbacks:
        if fb['hide'] == 1:
            fb['submitter_name'] = 'Anonymous'

        # Fetch selected feedback detail
    cursor.execute("""
           SELECT f.f_id, f.f_title AS title, c.category_name AS category, f.status, f.f_date AS date, f.f_body AS message, f.hide,
                  u.full_name AS submitter_name
           FROM feedbacks f
           LEFT JOIN categories c ON f.category_id = c.category_id
           LEFT JOIN fd_user u ON f.user_id = u.user_id
           WHERE f.f_id = %s
       """, (f_id,))
    selected = cursor.fetchone()

    if selected and selected['hide'] == 1:
        selected['submitter_name'] = 'Anonymous'

    # Fetch attachments if you have that table and route
    cursor.execute("SELECT attach_id, filename FROM attachments WHERE feedback_id = %s", (f_id,))
    attachments = cursor.fetchall()

    cursor.close()
    conn.close()

    if not selected:
        flash("Feedback not found.", "error")
        return redirect(url_for('admin.admin_dashboard'))

    # --- Render admin_dashboard.html with feedback detail ---
    return render_template(
        'admin_dashboard.html',
        section='feedbackDetails',
        user=user,
        feedbacks=feedbacks,
        selected_feedback=selected,
        attachments=attachments
    )

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
