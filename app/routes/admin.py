import io, matplotlib
import matplotlib.pyplot as plt
from flask import Blueprint, request, session, flash, redirect, url_for, render_template, send_file
from app.models.db import get_db_connection


admin = Blueprint('admin', __name__)
matplotlib.use('Agg')  # headless rendering for server environments
ADMIN_ROLE_ID = 1

# ---------------- feedback detail ------------------
@admin.route('/feedback/<int:f_id>')
def feedback_detail(f_id):
    # --- Admin role check ---
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
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

@admin.route('/update-status', methods=['POST'])
def update_status():
    # --- guard ---
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
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


@admin.route('/attachments/<int:attach_id>')
def admin_download_attachment(attach_id):
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
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

@admin.route('/admin/chart/category')
def category_report_chart():
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    # DB Query
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            c.category AS category,
            SUM(f.status = 1) AS pending,
            SUM(f.status = 2) AS inprogress,
            SUM(f.status = 3) AS resolved
        FROM feedback f
        JOIN category c ON f.category = c.category_id
        GROUP BY c.category
        ORDER BY c.category
    """)
    category_stats = cursor.fetchall()
    cursor.close()
    conn.close()

    # Data prep
    categories = [c['category'] for c in category_stats]
    pending     = [c['pending'] or 0 for c in category_stats]
    inprogress  = [c['inprogress'] or 0 for c in category_stats]
    resolved    = [c['resolved'] or 0 for c in category_stats]

    x = range(len(categories))
    width = 0.25  # bar width

    fig, ax = plt.subplots(figsize=(10, 6))

    ax.bar([i - width for i in x], pending, width=width, label='Pending', color='royalblue')
    ax.bar(x, inprogress, width=width, label='In Progress', color='tomato')
    ax.bar([i + width for i in x], resolved, width=width, label='Solved', color='orange')

    ax.set_xticks(x)
    ax.set_xticklabels(categories, rotation=45, ha='right')
    ax.set_ylabel("Feedback Count")
    ax.set_xlabel("Feedback Categories")
    ax.set_title("Feedback Status by Category")
    ax.legend()

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype='image/png')


@admin.route('/add-admin', methods=['POST'])
def add_admin():
    # Only admins can promote others
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    email = request.form.get('email', '').strip()
    if not email:
        flash("Email is required.", "error")
        return redirect(url_for('views.admin_dashboard', section='addAdmin'))

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 1) Look up the user by email
    cursor.execute(
        "SELECT user_id, full_name, role_id FROM fd_user WHERE email = %s",
        (email,)
    )
    user = cursor.fetchone()

    if not user:
        flash("User not found.", "error")
        cursor.close()
        conn.close()
        return redirect(url_for('views.admin_dashboard', section='addAdmin'))

    # 2) Check their current role
    if user['role_id'] == 1:
        flash(f"{user['full_name']} is already an Admin.", "info")
    else:
        # 3) Promote to admin
        try:
            cursor.execute(
                "UPDATE fd_user SET role_id = 1 WHERE user_id = %s",
                (user['user_id'],)
            )
            conn.commit()
            flash(f"{user['full_name']} has been promoted to Admin.", "success")
        except Exception as e:
            conn.rollback()
            flash(f"Could not promote user: {e}", "error")

    cursor.close()
    conn.close()

    # Back to the Add‑Admin section (or you could send them to viewUsers)
    return redirect(url_for('views.admin_dashboard', section='addAdmin'))

@admin.route('/deny-admin-request', methods=['POST'])
def deny_admin_request():
    # Only admins
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    user_id = request.form.get('user_id')
    if not user_id:
        flash("Invalid request.", "error")
        return redirect(url_for('admin.view_users'))

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE admin_requests SET status='Denied' WHERE user_id=%s AND status='Pending'",
            (user_id,)
        )
        conn.commit()
        flash("Request denied.", "info")
    except Exception as e:
        conn.rollback()
        flash(f"Could not deny request: {e}", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('admin.view_users'))



# ---------------- View Users ------------------
@admin.route('/view-users')
def view_users():
    # 1) Correct role check
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # 2) Ensure status comparison matches your DB exactly
    cursor.execute("""
        SELECT 
          ar.user_id,
          ar.username,
          ar.requested_at,
          ar.role_id   AS requested_role,
          u.role_id    AS current_role_id
        FROM admin_requests ar
        JOIN fd_user u  ON ar.user_id = u.user_id
        WHERE LOWER(ar.status) = 'pending'
        ORDER BY ar.requested_at DESC
    """)
    user_requests = cursor.fetchall()


    cursor.execute("SELECT * FROM fd_user WHERE user_id = %s",
                   (session['user_id'],))
    admin_user = cursor.fetchone()

    cursor.close()
    conn.close()


    return render_template('admin_dashboard.html',
                           section='viewUsers',
                           user_requests=user_requests,
                           user=admin_user)




# ---------------- Update User Role ------------------
@admin.route('/approve-admin-request', methods=['POST'])
def approve_admin_request():
    # 1) Admin guard
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    # 2) Read & validate form
    user_id     = request.form.get('user_id')
    new_role_id = request.form.get('new_role_id')
    if not user_id or not new_role_id:
        flash("Invalid request.", "error")
        return redirect(url_for('admin.view_users'))

    try:
        new_role_id = int(new_role_id)
        user_id     = int(user_id)
    except ValueError:
        flash("Invalid user or role ID.", "error")
        return redirect(url_for('admin.view_users'))

    conn   = get_db_connection()
    cursor = conn.cursor()

    try:
        # 3) Promote user
        cursor.execute(
            "UPDATE fd_user SET role_id = %s WHERE user_id = %s",
            (new_role_id, user_id)
        )

        # 4) Mark the request approved
        cursor.execute(
            "UPDATE admin_requests "
            "SET status = 'Approved' "
            "WHERE user_id = %s AND status = 'Pending'",
            (user_id,)
        )

        conn.commit()
        flash("User has been promoted to Admin.", "success")

    except Exception as e:
        conn.rollback()
        flash(f"Failed to update role: {e}", "error")

    finally:
        cursor.close()
        conn.close()

    # 5) Back to the pending‑requests view
    return redirect(url_for('admin.view_users'))


@admin.route('/add-category', methods=['POST'])
def add_category():
    if 'user_id' not in session or session.get('role_id') != ADMIN_ROLE_ID:
        flash('Access denied.', 'error')
        return redirect(url_for('auth.login'))

    category = request.form.get('category', '').strip()

    if not category:
        flash('Category name is required.', 'error')
        return redirect(url_for('views.admin_dashboard', section='addCategory'))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM category WHERE category = %s", (category,))
        if cursor.fetchone():
            flash('Category already exists.', 'warning')
        else:
            cursor.execute("INSERT INTO category (category) VALUES (%s)", (category,))
            conn.commit()
            flash('Category added successfully!', 'success')
    except Exception as e:
        conn.rollback()
        flash(f'Database error: {e}', 'error')
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section='viewCategory'))