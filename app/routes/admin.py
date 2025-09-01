# app/routes/admin.py
import io
import matplotlib
matplotlib.use('Agg')  # headless rendering for server environments
from datetime import timedelta, datetime
from app.extensions import cache
import matplotlib.pyplot as plt
from flask import Blueprint, request, session, flash, redirect, url_for, render_template, send_file, current_app, jsonify
from app.models import get_db_connection
from app.routes.auth import role_required, ADMIN_ROLE_ID

admin = Blueprint('admin', __name__)

def is_ajax(req):
    return req.headers.get('X-Requested-With') == 'XMLHttpRequest'


def json_response(success, message=None, status=200, category=None, **extra):
    payload = {'success': bool(success)}
    if message is not None:
        payload['message'] = message
    if category:
        payload['category'] = category
    payload.update(extra)
    return jsonify(payload), status

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

    # If AJAX or explicit ajax=1 param, return only the fragment HTML (text/html)
    # NOTE: frontend expects an HTML fragment it can parse and extract #feedbackDetail from.
    if is_ajax(request) or request.args.get('ajax') == '1':
        html = render_template('partials/feedback_detail_fragment.html',
                               feedback=selected,
                               attachments=attachments)
        # Return the HTML fragment (content-type text/html) so client DOMParser flow works.
        return html, 200

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

    f_id   = request.form.get('f_id')
    status = request.form.get('status')

    if not (f_id and status in {'1','2','3'}):
        msg = 'Invalid feedback ID or status.'
        if is_ajax(request):
            return json_response(False, msg, status=400)
        flash(msg, 'error')
        return redirect(url_for('views.admin_dashboard')), 400

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "UPDATE feedback SET status = %s WHERE f_id = %s",
            (status, f_id)
        )
        conn.commit()
        msg = 'Feedback status updated.'

        # If AJAX: return success + latest aggregated counts so client can update cards without full reload
        if is_ajax(request):
            try:
                # Re-query counts
                cursor.execute("""
                    SELECT
                      COUNT(*) AS total,
                      SUM(status = 1) AS pending,
                      SUM(status = 2) AS inprogress,
                      SUM(status = 3) AS solved
                    FROM feedback
                """)
                counts = cursor.fetchone() or {}
                # ensure ints (DB may return Decimal/None)
                counts_normalized = {
                    'total': int(counts.get('total') or 0),
                    'pending': int(counts.get('pending') or 0),
                    'inprogress': int(counts.get('inprogress') or 0),
                    'solved': int(counts.get('solved') or 0)
                }
            except Exception:
                # fallback: zeroed counts if something odd
                counts_normalized = {'total': 0, 'pending': 0, 'inprogress': 0, 'solved': 0}

            return json_response(True, msg, status=200, category='success',
                                 status_updated=status, counts=counts_normalized)

        flash(msg, 'success')
    except Exception:
        conn.rollback()
        msg = 'DB error while updating status'
        if is_ajax(request):
            return json_response(False, msg, status=500)
        flash(msg, 'error')
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard'))



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
    if not email:
        msg = "Email is required."
        if is_ajax(request):
            return json_response(False, msg, status=400, category='error')
        flash(msg, "error")
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
        msg = "User not found."
        cursor.close()
        conn.close()
        if is_ajax(request):
            return json_response(False, msg, status=404, category='error')
        flash(msg, "error")
        return redirect(url_for('views.admin_dashboard', section='addAdmin'))

    # 2) Check their current role
    if user['role_id'] == 1:
        msg = f"{user['full_name']} is already an Admin."
        if is_ajax(request):
            return json_response(False, msg, status=200, category='info')
        flash(msg, "info")
    else:
        # 3) Promote to admin
        try:
            cursor.execute(
                "UPDATE fd_user SET role_id = 1 WHERE user_id = %s",
                (user['user_id'],)
            )
            conn.commit()
            msg = f"{user['full_name']} has been promoted to Admin."
            if is_ajax(request):
                return json_response(True, msg, status=200, category='success', user_id=user['user_id'], full_name=user['full_name'])
            flash(msg, "success")
        except Exception:
            conn.rollback()
            msg = "Could not promote user( Internal server error)"
            if is_ajax(request):
                return json_response(False, msg, status=500, category='error')
            flash(msg, "error")

    cursor.close()
    conn.close()

    return redirect(url_for('views.admin_dashboard', section='addAdmin'))


# ---------------- Update User Role ------------------
@admin.route('/approve-admin-request', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def approve_admin_request():
    user_id = request.form.get('user_id')
    new_role_id = request.form.get('new_role_id')

    if not user_id or not new_role_id:
        if is_ajax(request):
            return json_response(False, "Invalid request", status=400)
        flash("Invalid request.", "error")
        return redirect(url_for('views.admin_dashboard', section='viewUsers'))

    try:
        user_id = int(user_id)
        new_role_id = int(new_role_id)
    except ValueError:
        if is_ajax(request):
            return json_response(False, "Invalid IDs", status=400)
        flash("Invalid user or role ID.", "error")
        return redirect(url_for('views.admin_dashboard', section='viewUsers'))

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE fd_user SET role_id = %s WHERE user_id = %s", (new_role_id, user_id))
        cursor.execute("UPDATE admin_requests SET status = 'Approved' WHERE user_id = %s AND status = 'Pending'", (user_id,))
        conn.commit()
        msg = "User has been promoted to Admin."
        if is_ajax(request):
            # Tell the client which user-row to remove from the pending list
            return json_response(True, msg, status=200, category='success', removed_user_id=user_id)
        flash(msg, "success")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Failed to approve admin request")
        if is_ajax(request):
            return json_response(False, "Internal error", status=500)
        flash("Failed to update role: Internal error", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section='viewUsers'))


@admin.route('/deny-admin-request', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def deny_admin_request():
    user_id = request.form.get('user_id')
    if not user_id:
        if is_ajax(request):
            return json_response(False, "Invalid request", status=400)
        flash("Invalid request.", "error")
        return redirect(url_for('views.admin_dashboard', section='viewUsers'))

    try:
        user_id = int(user_id)
    except ValueError:
        if is_ajax(request):
            return json_response(False, "Invalid user id", status=400)
        flash("Invalid user id.", "error")
        return redirect(url_for('views.admin_dashboard', section='viewUsers'))

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE admin_requests SET status='Denied' WHERE user_id=%s AND status='Pending'", (user_id,))
        conn.commit()
        msg = "Request denied."
        if is_ajax(request):
            # Tell the client to remove this row from pending list (so it can appear under denied list if needed)
            return json_response(True, msg, status=200, category='info', removed_user_id=user_id)
        flash(msg, "info")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Could not deny request")
        if is_ajax(request):
            return json_response(False, "Internal error", status=500)
        flash("Could not deny request (Internal server error)", "error")
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section='viewUsers'))


@admin.route('/admin/requests/reopen', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def reopen_admin_request():
    user_id = request.form.get('user_id')
    if not user_id:
        if is_ajax(request):
            return json_response(False, "Invalid request", status=400)
        flash("Invalid request.", "error")
        return redirect(url_for('views.admin_dashboard', section='deniedRequests'))

    try:
        user_id = int(user_id)
    except ValueError:
        if is_ajax(request):
            return json_response(False, "Invalid user id", status=400)
        flash("Invalid user id.", "error")
        return redirect(url_for('views.admin_dashboard', section='deniedRequests'))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE admin_requests SET status = 'Pending' WHERE user_id = %s AND status = 'Denied'", (user_id,))
        conn.commit()
        msg = "Request re-opened and moved back to pending."
        if is_ajax(request):
            # Remove from denied list in the UI (client may choose to re-insert into pending list)
            return json_response(True, msg, status=200, category='success', removed_user_id=user_id)
        flash(msg, "success")
    except Exception:
        conn.rollback()
        current_app.logger.exception("Could not re-open request")
        if is_ajax(request):
            return json_response(False, "Internal error", status=500)
        flash("Could not re-open request ( Internal server error )", "error")
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section='deniedRequests'))

@admin.route('/admin/requests/list.json')
@role_required(ADMIN_ROLE_ID)
def admin_requests_list_json():
    """
    Return current pending and denied admin requests as JSON.
    This is used by the frontend to refresh the Pending/Denied tables
    after an AJAX action so UI reflects DB state without full reload.
    """
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT user_id, username, current_role_id, requested_role, requested_at
            FROM admin_requests
            WHERE status = 'Pending'
            ORDER BY requested_at DESC
        """)
        pending = cur.fetchall() or []

        cur.execute("""
            SELECT user_id, username, current_role_id, requested_role, requested_at
            FROM admin_requests
            WHERE status = 'Denied'
            ORDER BY requested_at DESC
        """)
        denied = cur.fetchall() or []
    finally:
        cur.close()
        conn.close()

    def serialize(rows):
        out = []
        for r in rows:
            requested_at = r.get('requested_at')
            if isinstance(requested_at, datetime):
                requested_at = requested_at.strftime('%Y-%m-%d %H:%M')
            else:
                requested_at = str(requested_at or '')
            out.append({
                'user_id': r.get('user_id'),
                'username': r.get('username') or '',
                'current_role_id': r.get('current_role_id'),
                'requested_role': r.get('requested_role'),
                'requested_at': requested_at
            })
        return out

    return jsonify({'pending': serialize(pending), 'denied': serialize(denied)})


@admin.route('/add-category', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def add_category():

    category = request.form.get('category', '').strip()

    if not category:
        msg = 'Category name is required.'
        if is_ajax(request):
            return json_response(False, msg, status=400, category='error')
        flash(msg, 'error')
        return redirect(url_for('views.admin_dashboard', section='addCategory'))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM category WHERE category = %s", (category,))
        if cursor.fetchone():
            msg = 'Category already exists.'
            if is_ajax(request):
                return json_response(False, msg, status=409, category='warning')
            flash(msg, 'warning')
        else:
            cursor.execute("INSERT INTO category (category) VALUES (%s)", (category,))
            conn.commit()
            msg = 'Category added successfully!'
            if is_ajax(request):
                return json_response(True, msg, status=201, category='success', category_name=category)
            flash(msg, 'success')
    except Exception as e:
        conn.rollback()
        msg = f'Database error: {e}'
        if is_ajax(request):
            return json_response(False, msg, status=500, category='error')
        flash(msg, 'error')
    finally:
        cursor.close()
        conn.close()

    return redirect(url_for('views.admin_dashboard', section='viewCategory'))



@admin.route('/update-role', methods=['POST'])
@role_required(ADMIN_ROLE_ID)
def update_role_api():
    user_id = request.form.get('user_id')
    new_role_id = request.form.get('new_role_id')

    if not user_id or not new_role_id:
        return json_response(False, "Missing params", status=400)

    try:
        user_id_i = int(user_id)
        new_role_id_i = int(new_role_id)
    except ValueError:
        return json_response(False, "Invalid params", status=400)

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE fd_user SET role_id=%s WHERE user_id=%s", (new_role_id_i, user_id_i))
        conn.commit()
    except Exception:
        conn.rollback()
        current_app.logger.exception("Error updating role")
        return json_response(False, "Internal error", status=500)
    finally:
        cur.close()
        conn.close()
    return json_response(True, "Role updated", status=200, category='success')
