# app/routes/views.py
from flask import Blueprint, render_template, session, request
from app.models import get_db_connection
from app.routes.auth import role_required, ADMIN_ROLE_ID, USER_ROLE_ID

views = Blueprint('views', __name__)

USER_SECTIONS  = {'home', 'submit', 'history', 'profile', 'changePassword'}
ADMIN_SECTIONS = {'home', 'reports', 'viewUsers', 'addAdmin', 'feedbackDetail', 'profile', 'changePassword', 'addCategory', 'viewCategory'}

@views.route('/')
def index():
    return render_template('index.html')

@views.route('/user')
@role_required(USER_ROLE_ID)
def user_dashboard():

    section = request.args.get('section', 'home')
    if section not in USER_SECTIONS:
        section = 'home'

    user_id = session.get('user_id')

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

    # check the last request status
    cur.execute("""
        SELECT status
        FROM admin_requests
        WHERE user_id = %s AND status = 'Pending'
        LIMIT 1
    """, (user_id,))
    pending_row = cur.fetchone()
    has_pending_request = bool(pending_row)

    cur.execute("""
        SELECT status
        FROM admin_requests
        WHERE user_id = %s AND status = 'Denied'
        LIMIT 1
    """, (user_id,))
    denied_row = cur.fetchone()
    has_denied_request = bool(denied_row)


    cur.close()
    conn.close()

    return render_template('user_dashboard.html',
                           section=section,
                           user = user,
                           feedback_list = feedback_list,
                           categories = categories,
                           has_pending_request=has_pending_request,
                           has_denied_request=has_denied_request)

@views.route('/admin')
@role_required(ADMIN_ROLE_ID)
def admin_dashboard():

    section = request.args.get('section', 'home')
    if section not in ADMIN_SECTIONS:
        section = 'home'

    period = request.args.get('period', 'all')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Admin user info
    cursor.execute("SELECT * FROM fd_user WHERE user_id = %s", (session['user_id'],))
    user = cursor.fetchone()

    # Feedbacks
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
    for fb in feedbacks:
        if fb['hide'] == 1:
            fb['submitter_name'] = 'Anonymous'

    # Admin requests with the current role and requested role
    cursor.execute("""
            SELECT 
              ar.user_id,
              ar.username,
              ar.status,
              ar.requested_at,
              ar.role_id        AS requested_role,
              u.full_name,
              u.email,
              u.role_id         AS current_role_id
            FROM admin_requests ar
            JOIN fd_user u   ON ar.user_id = u.user_id
            WHERE ar.status = 'Pending'
            ORDER BY ar.requested_at DESC
        """)
    admin_requests = cursor.fetchall()

    # Users list
    cursor.execute("""
        SELECT user_id, username, full_name, role_id, status, email
        FROM fd_user
        ORDER BY user_id ASC
    """)
    users = cursor.fetchall()

    # Example: simple feedback counts by status
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM feedback
        GROUP BY status
    """)
    feedback_status_counts = cursor.fetchall()

    #  Timeline aggregates
    cursor.execute("""
          SELECT 
            f_date AS date,
            SUM(status = 1)     AS pending,
            SUM(status = 2)     AS inprogress,
            SUM(status = 3)     AS resolved
          FROM feedback
          GROUP BY f_date
          ORDER BY f_date
        """)
    timeline_stats = cursor.fetchall()

    #  Category aggregates
    cursor.execute("""
          SELECT
            c.category          AS category,
            SUM(f.status = 1)   AS pending,
            SUM(f.status = 2)   AS inprogress,
            SUM(f.status = 3)   AS resolved
          FROM feedback f
          JOIN category c ON f.category = c.category_id
          GROUP BY c.category
          ORDER BY c.category
        """)
    category_stats = cursor.fetchall()

    # Fetch all categories, pushing 'Other' to the bottom
    cursor.execute("""
        SELECT category_id, category
        FROM category
        ORDER BY 
          CASE 
            WHEN LOWER(category) = 'other' THEN 1
            ELSE 0
          END,
          category ASC
    """)
    categories = cursor.fetchall()

    cursor.close()
    conn.close()

    return render_template("admin_dashboard.html",
                           user=user,
                           feedbacks=feedbacks,
                           admin_requests=admin_requests,
                           users=users,
                           feedback_status_counts=feedback_status_counts,
                           timeline_stats=timeline_stats,
                           category_stats=category_stats,
                           categories=categories,
                           section=section,
                           period=period)
