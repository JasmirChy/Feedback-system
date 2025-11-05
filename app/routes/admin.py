# app/routes/admin.py
import io
import matplotlib
matplotlib.use('Agg')  # headless rendering for server environments
from datetime import timedelta, datetime
from app.extensions import cache
import matplotlib.pyplot as plt
from flask import Blueprint, request, session, flash, redirect, url_for, render_template, send_file, current_app
from app.models import get_db_connection
from app.routes.auth import role_required, ADMIN_ROLE_ID

admin = Blueprint('admin', __name__)

# ---------------- feedback detail ------------------
@admin.route('/feedback/<int:f_id>')
@role_required(ADMIN_ROLE_ID)
def feedback_detail(f_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # --- Get current admin user info ---
        cursor.execute("SELECT * FROM fd_user WHERE user_id = %s", (session['user_id'],))
        user = cursor.fetchone()

        # Get all feedbacks (for the table) -- needed to render full dashboard
        cursor.execute("""
            SELECT f.f_id, f.f_title, u.full_name AS submitter_name, c.category AS category_name,
                   f.status, f.hide, f.f_date AS f_date, f.f_body
            FROM feedback f
            LEFT JOIN fd_user u ON f.user_id = u.user_id
            LEFT JOIN category c ON f.category = c.category_id
            ORDER BY f.f_date DESC
        """)
        feedbacks = cursor.fetchall() or []

        # Replace names for hidden feedbacks and format date
        for fb in feedbacks:
            if fb.get('hide') == 1:
                fb['submitter_name'] = 'Anonymous'
            d = fb.get('f_date')
            if d:
                try:
                    fb['f_date'] = d.strftime('%Y-%m-%d') if not isinstance(d, str) else d[:10]
                except Exception:
                    pass

        # Fetch selected feedback detail
        cursor.execute("""
           SELECT f.f_id, f.f_title AS title, c.category AS category, f.status, f.f_date AS date,
                  f.f_body AS message, f.hide, u.full_name AS submitter_name
           FROM feedback f
           LEFT JOIN category c ON f.category = c.category_id
           LEFT JOIN fd_user u ON f.user_id = u.user_id
           WHERE f.f_id = %s
       """, (f_id,))
        selected = cursor.fetchone()

        if selected and selected.get('hide') == 1:
            selected['submitter_name'] = 'Anonymous'

        # Fetch attachments if exists
        cursor.execute("SELECT attach_id, filename FROM attachments WHERE f_id = %s", (f_id,))
        attachments = cursor.fetchall() or []

    finally:
        cursor.close()
        conn.close()

    if not selected:
        flash("Feedback not found.", "error")
        return redirect(url_for('views.admin_dashboard'))

    # Otherwise return full dashboard page as before
    return render_template(
        'admin_dashboard.html',
        section='feedbackDetail',
        user=user,
        feedbacks=feedbacks,
        feedback=selected,
        attachments=attachments
    )


@admin.route('/update-status', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def update_status():
    f_id = request.form.get('f_id')
    status = request.form.get('status')
    section_to_redirect = request.form.get('current_section', 'home')

    if not (f_id and status in {'1', '2', '3'}):
        flash('Invalid feedback ID or status.', 'error')
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if the feedback exists first, and get its current status for the flash message
        cursor.execute("SELECT f_title, status FROM feedback WHERE f_id = %s", (f_id,))
        feedback = cursor.fetchone()
        if not feedback:
            flash(f"Feedback ID {f_id} not found.", 'error')
            return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

        # Update status
        cursor.execute(
            "UPDATE feedback SET status = %s WHERE f_id = %s",
            (status, f_id)
        )
        conn.commit()

        status_map = {'1': 'Pending', '2': 'In Progress', '3': 'Solved'}
        msg = f"Status for '{feedback['f_title']}' updated to {status_map[status]}."
        flash(msg, 'success')

    except Exception as e:
        conn.rollback()
        flash(f"Could not update status: {e}", 'error')
    finally:
        cursor.close()
        conn.close()

    # Redirect using PRG pattern
    return redirect(url_for('views.admin_dashboard', section=section_to_redirect))



@admin.route('/attachments/<int:attach_id>')
@role_required(ADMIN_ROLE_ID)
def admin_download_attachment(attach_id):

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

@cache.memoize()
def _build_category_chart_bytes(period):
    now = datetime.utcnow()
    if period == 'week':
        start = now - timedelta(days=7)
    elif period == 'month':
        start = now - timedelta(days=30)
    elif period == 'year':
        start = now - timedelta(days=365)
    else:
        start = None

    sql = """
      SELECT
        c.category          AS category,
        SUM(f.status = 1)  AS pending,
        SUM(f.status = 2)  AS inprogress,
        SUM(f.status = 3)  AS solved
      FROM feedback f
      JOIN category c ON f.category = c.category_id
    """
    params = []
    if start:
        sql += " WHERE f.f_date >= %s"
        params.append(start)

    sql += " GROUP BY c.category ORDER BY c.category"

    conn = get_db_connection()
    cur  = conn.cursor(dictionary=True)
    cur.execute(sql, params)
    stats = cur.fetchall()
    cur.close()
    conn.close()

    categories       = [r['category']   for r in stats]
    pending    = [r['pending']    or 0 for r in stats]
    inprogress     = [r['inprogress'] or 0 for r in stats]
    resolved   = [r['solved']   or 0 for r in stats]

    n = len(categories)
    n_series = 3

    inner_gap = 0  # 0 = bars touch; increase to e.g., 0.02 for a tiny gap
    total_inner = inner_gap * (n_series - 1)

    # Make bars fill exactly 1.0 unit minus the inner gaps:
    bar_width = (1.0 - total_inner) / n_series
    group_width = bar_width * n_series + total_inner

    spacing = 1.5

    x_centers = [i * spacing for i in range(n)]

    base_offset = -group_width / 2 + bar_width / 2
    offsets = [base_offset + i * bar_width for i in range(n_series)]

    fig, ax = plt.subplots(figsize=(10,6))

    ax.bar([x + offsets[0] for x in x_centers], pending, width=bar_width, label='Pending', color='#fef3c7') #light yellow
    ax.bar([x + offsets[1] for x in x_centers], inprogress, width=bar_width, label='In Progress', color='#bfdbfe') #light blue
    ax.bar([x + offsets[2] for x in x_centers], resolved, width=bar_width, label='Solved', color='#bbf7d0') #light green

    ax.set_xticks(x_centers)
    ax.set_xticklabels(categories, rotation=45, ha='right')

    ax.set_ylabel("Feedback Count")
    ax.set_xlabel("Feedback Categories")
    ax.set_title(f"Feedback Status by Category ({period.capitalize()})")
    ax.legend()
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf_bytes = buf.getvalue()
    buf.close()
    return buf_bytes

@admin.route('/admin/chart/category')
@role_required(ADMIN_ROLE_ID)
def category_report_chart():
    # figure out period
    period = request.args.get('period', 'all')
    img_bytes = _build_category_chart_bytes(period)
    return send_file(io.BytesIO(img_bytes), mimetype='image/png', download_name=f'category_{period}.png')

@admin.route('/requests/pending')
@role_required(ADMIN_ROLE_ID)
def show_pending_requests():
    return redirect(url_for('views.admin_dashboard', section='viewUsers'))

@admin.route('/requests/denied')
@role_required(ADMIN_ROLE_ID)
def show_denied_requests():
    return redirect(url_for('views.admin_dashboard', section='deniedRequests'))


@admin.route('/add-admin', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def add_admin():
    email = request.form.get('email', '').strip()
    section_to_redirect = request.form.get('current_section', 'addAdmin')  # Default to where the form is located

    if not email:
        flash("Email is required.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1) Look up the user by email
        cursor.execute(
            "SELECT user_id, full_name, role_id FROM fd_user WHERE email = %s",
            (email,)
        )
        user = cursor.fetchone()

        if not user:
            flash("User not found.", "error")
            return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

        # 2) Check their current role
        if user['role_id'] == ADMIN_ROLE_ID:
            flash(f"{user['full_name']} is already an Admin.", "info")
        else:
            # 3) Promote to admin
            cursor.execute(
                "UPDATE fd_user SET role_id = %s WHERE user_id = %s",
                (ADMIN_ROLE_ID, user['user_id'])
            )
            conn.commit()
            flash(f"{user['full_name']} has been promoted to Admin.", "success")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Could not promote user")
        flash("Could not promote user (Internal server error)", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section=section_to_redirect))


# ---------------- Update User Role ------------------
@admin.route('/approve-admin-request', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def approve_admin_request():
    user_id = request.form.get('user_id')
    new_role_id = request.form.get('new_role_id')
    section_to_redirect = request.form.get('current_section', 'addAdmin')  # Used for PRG

    if not user_id or not new_role_id:
        flash("Invalid request: Missing user ID or new role ID.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    try:
        user_id_i = int(user_id)
        new_role_id_i = int(new_role_id)
    except ValueError:
        flash("Invalid user or role ID format.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Update user role
        cursor.execute("UPDATE fd_user SET role_id = %s WHERE user_id = %s", (new_role_id_i, user_id_i))
        # 2. Update request status
        cursor.execute("UPDATE admin_requests SET status = 'Approved' WHERE user_id = %s AND status = 'Pending'",
                       (user_id_i,))
        conn.commit()

        # Fetch the user's name for a better message
        name_cursor = conn.cursor(dictionary=True)
        name_cursor.execute("SELECT full_name FROM fd_user WHERE user_id = %s", (user_id_i,))
        user_name = (name_cursor.fetchone() or {}).get('full_name', f'User {user_id_i}')
        name_cursor.close()

        flash(f"{user_name} has been promoted and their request approved.", "success")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Failed to approve admin request")
        flash("Failed to update role: Internal server error.", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section=section_to_redirect))


@admin.route('/deny-admin-request', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def deny_admin_request():
    user_id = request.form.get('user_id')
    section_to_redirect = request.form.get('current_section', 'addAdmin')

    if not user_id:
        flash("Invalid request: Missing user ID.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    try:
        user_id_i = int(user_id)
    except ValueError:
        flash("Invalid user ID format.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Deny the request
        cursor.execute("UPDATE admin_requests SET status='Denied' WHERE user_id=%s AND status='Pending'", (user_id_i,))
        conn.commit()

        # Fetch the username for a better message
        name_cursor = conn.cursor(dictionary=True)
        name_cursor.execute("SELECT full_name FROM fd_user WHERE user_id = %s", (user_id_i,))
        user_name = (name_cursor.fetchone() or {}).get('full_name', f'User {user_id_i}')
        name_cursor.close()

        flash(f"Admin request for {user_name} denied.", "info")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Could not deny request")
        flash("Could not deny request (Internal server error).", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section=section_to_redirect))


@admin.route('/admin/requests/reopen', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def reopen_admin_request():
    user_id = request.form.get('user_id')
    section_to_redirect = request.form.get('current_section', 'deniedRequests')

    if not user_id:
        flash("Invalid request: Missing user ID.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    try:
        user_id_i = int(user_id)
    except ValueError:
        flash("Invalid user ID format.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE admin_requests SET status = 'Pending' WHERE user_id = %s AND status = 'Denied'",
                    (user_id_i,))
        conn.commit()
        flash("Request re-opened and moved back to pending list.", "success")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Could not re-open request")
        flash("Could not re-open request (Internal server error).", "error")
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

@admin.route('/admin/requests/list.json')
@role_required(ADMIN_ROLE_ID)
def admin_requests_list_json():
    flash("This endpoint is deprecated. Lists are loaded with the page.", "warning")
    return redirect(url_for('views.admin_dashboard', section='addAdmin'))


@admin.route('/add-category', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def add_category():
    category = request.form.get('category', '').strip()
    # Redirect to viewCategory as the result will be seen there
    section_to_redirect = 'viewCategory'

    if not category:
        flash('Category name is required.', 'error')
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if category exists (case-insensitive)
        cursor.execute("SELECT category FROM category WHERE LOWER(category) = LOWER(%s)", (category,))
        if cursor.fetchone():
            flash(f"Category '{category}' already exists.", 'warning')
        else:
            cursor.execute("INSERT INTO category (category) VALUES (%s)", (category,))
            conn.commit()
            flash(f"Category '{category}' added successfully!", 'success')
    except Exception:
        conn.rollback()
        current_app.logger.exception("Database error adding category")
        flash('Database error adding category.', 'error')
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section=section_to_redirect))



@admin.route('/update-role', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def update_role_api():
    user_id = request.form.get('user_id')
    new_role_id = request.form.get('new_role_id')
    section_to_redirect = request.form.get('current_section', 'viewUsers')

    if not user_id or not new_role_id:
        flash("Missing user ID or new role ID.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    try:
        user_id_i = int(user_id)
        new_role_id_i = int(new_role_id)
    except ValueError:
        flash("Invalid parameters for role update.", "error")
        return redirect(url_for('views.admin_dashboard', section=section_to_redirect))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE fd_user SET role_id=%s WHERE user_id=%s", (new_role_id_i, user_id_i))
        conn.commit()
        # Fetch the user's name for a better message
        name_cursor = conn.cursor(dictionary=True)
        name_cursor.execute("SELECT full_name FROM fd_user WHERE user_id = %s", (user_id_i,))
        user_name = (name_cursor.fetchone() or {}).get('full_name', f'User {user_id_i}')
        name_cursor.close()

        flash(f"Role for {user_name} updated successfully.", "success")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Error updating role")
        flash("Internal error updating role.", "error")
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section=section_to_redirect))