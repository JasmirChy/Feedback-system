# app/routes/auth.py
import random, datetime, mysql.connector, re
from datetime import datetime, timedelta
from flask import Blueprint, render_template, url_for, request, redirect, flash, session
from werkzeug.security import generate_password_hash, check_password_hash

from app.models.db import get_db_connection
from app.services.email import generate_unique_user_id, send_otp_email
from functools import wraps


auth = Blueprint('auth', __name__)
ADMIN_ROLE_ID = 1
USER_ROLE_ID = 2

# ─── Optional helper: require login ───
def login_required(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to continue.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return wrapped


@auth.route('/login', methods=['GET', 'POST'])
def login():

    # if they already have a valid session, skip the form
    if 'user_id' in session:
        return redirect(
            url_for('views.admin_dashboard')
            if session.get('role_id') == ADMIN_ROLE_ID
            else url_for('views.user_dashboard')
        )

    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        remember = 'remember_me' in request.form

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id, full_name, role_id, password FROM fd_user WHERE username = %s AND status = 1",(username,))

        user = cursor.fetchone()
        cursor.close()

        if not user or not check_password_hash(user['password'], password):
            flash("Invalid username or password", "error")
            return render_template('login.html')

        # store minimal session info
        session['user_id'] = user['user_id']
        session['username'] = username
        session['full_name'] = user['full_name']
        session['role_id'] = user['role_id']

        # set permanent session if “remember me” checked
        session.permanent = bool(remember)

        # redirect based on a role
        target = 'views.admin_dashboard' if user['role_id'] == ADMIN_ROLE_ID else 'views.user_dashboard'
        return redirect(url_for(target))

    return render_template('login.html')


@auth.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.form

        user_type = data.get('usertype')
        email = data.get('email')
        full_name = data.get('fullname')
        id_number = data.get('idnumber')
        d_o_b = data.get('dob')
        designation = data.get('designation')
        user_name = data.get('username')
        password = data.get('password1')
        confirm = data.get('password2')
        role_id = 2
        status = 1

        passhash = generate_password_hash(password, 'pbkdf2:sha256')

        # 1) Basic validations
        if password != confirm:
            flash("Passwords do not match.", "error")
            return render_template('signup.html')
        if not all([email, full_name, user_name, password]):
            flash("Please fill in all required fields.", "error")
            return render_template('signup.html')

        conn = get_db_connection()
        cur = conn.cursor()

        try:
            if user_type == 'studentStaff':

                # Check for existing username/email
                cur.execute("SELECT 1 FROM fd_user WHERE username = %s OR email = %s", (user_name, email))
                if cur.fetchone():
                    flash("Username or email already exists.", "error")
                    return render_template('signup.html')

                # Verify ID exists in student_table or staff_table
                cur.execute(
                    'select 1 from student_table where student_id = %s union select 1 from staff_table where staff_id = %s',
                    (id_number, id_number))

                if cur.fetchone() is None:
                    flash("No record found in student/staff table for given ID.", 'error')
                    return render_template('signup.html')

                cur.execute(
                    """insert into fd_user( user_id, full_name, username, password, email, designation, dob, role_id, status) values( %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (id_number, full_name, user_name, passhash, email, designation, d_o_b, role_id, status))

                conn.commit()

                flash("Account created!", "success")
                return redirect(url_for('auth.login'))

            else:
                # Public user: generate unique numeric ID & OTP
                user_id = generate_unique_user_id(cur)

                otp = f"{random.randint(0, 999999):06d}"
                expires_at = datetime.utcnow() + timedelta(minutes=10)

                cur.execute(
                    """insert into email_verifications( email, otp, expires_at) values( %s, %s, %s) on duplicate key update otp=%s, expires_at=%s""",
                    (email, otp, expires_at, otp, expires_at))

                conn.commit()

                send_otp_email(email, otp)

                session['pending_user'] = {
                    'user_id': user_id,
                    'full_name': full_name,
                    'user_name': user_name,
                    'password': passhash,
                    'email': email,
                    'designation': 'General',
                    'dob': d_o_b,
                    'role_id': role_id,
                    'status': status,
                    'otp': otp,
                    'expires_at': expires_at.isoformat()
                }

                return redirect(url_for('auth.verify_otp'))
        except mysql.connector.Error as err:
            flash(f'Database error: {err.msg}', 'error')
            return render_template('signup.html')

    return render_template('signup.html')


@auth.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    sign = session.get('pending_user')
    reset = session.get('reset_email')

    if not sign and not reset:
        flash("Session expired. Please sign up again.", "error")
        return redirect(url_for('auth.signup'))

    # pick the right context and expiry
    context = sign or reset
    flow_name = 'signup' if sign else 'reset'

    if request.method == 'POST':
        entered_otp = request.form.get('otp', '').strip()

        # if they hit submit with an empty field, just re-render without flashing
        if not entered_otp:
            return render_template('verify_otp.html')

        stored_otp = context.get('otp')
        expires_at_str = context.get('expires_at')

        # Convert expires_at back to datetime
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
        except ValueError:
            # clear only the relevant session key
            if flow_name == 'signup':
                session.pop('pending_user', None)
                flash("Your signup session has expired. Please register again.", "error")
                return redirect(url_for('auth.signup'))
            else:
                session.pop('reset_email', None)
                flash("Your password‐reset session has expired. Please request a new reset link.", "error")
                return redirect(url_for('auth.forget_password'))

        # truly expired?
        if datetime.utcnow() > expires_at:
            if flow_name == 'signup':
                session.pop('pending_user', None)
                flash("Your signup OTP expired. Please register again.", "error")
                return redirect(url_for('auth.signup'))
            else:
                session.pop('reset_email', None)
                flash("Your reset OTP expired. Please request a new link.", "error")
                return redirect(url_for('auth.forget_password'))

            # wrong but still valid → stay on this page
        if entered_otp != stored_otp:
            flash("Invalid OTP. Please try again.", "error")
            return render_template('verify_otp.html')

        if flow_name == 'signup':
            conn = get_db_connection()
            cursor = conn.cursor()

            try:
                cursor.execute("""
                    INSERT INTO fd_user (user_id, full_name, username, password, email, designation, dob, role_id, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    sign['user_id'],
                    sign['full_name'],
                    sign['user_name'],
                    sign['password'],
                    sign['email'],
                    sign['designation'],
                    sign['dob'],
                    sign['role_id'],
                    sign['status']
                ))
                conn.commit()

                session.pop('pending_user', None)  # clear session after success
                flash("Account created successfully!", "success")
            except mysql.connector.Error as err:
                flash(f"Database error: {err.msg}", "error")
                return render_template('verify_otp.html')
            return redirect(url_for('auth.login'))
        else:
            # Mark that the user can now set a new password
            session.pop('reset_email', None)
            varified = context['email']
            session['reset_verified_email'] = varified
            return redirect(url_for('auth.reset_password'))
    return render_template('verify_otp.html')


@auth.route('/forget_password', methods=['GET', 'POST'])
def forget_password():
    if request.method == 'POST':
        email = request.form.get('email')
        # verify this email exists

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM fd_user WHERE email=%s", (email,))

        row = cur.fetchone()
        if not row:
            flash("No account with that email.", "error")
            return render_template('forget_password.html')

        # generate & store OTP
        otp = f"{random.randint(0, 999999):06d}"
        expires = datetime.utcnow() + timedelta(minutes=10)
        cur.execute(
            """INSERT INTO email_verifications(email,otp,expires_at)
               VALUES (%s,%s,%s)
               ON DUPLICATE KEY UPDATE otp=%s,expires_at=%s""",
            (email, otp, expires, otp, expires)
        )
        conn.commit()
        cur.close()

        send_otp_email(email, otp)
        session['reset_email'] = {
                'email': email,
                'otp': otp,
                'expires_at': expires.isoformat(),
                # we'll fill in 'new_password' later once they enter it
        }
        return redirect(url_for('auth.verify_otp'))
    return render_template('forgot_password.html')


@auth.route('/reset-password', methods=['GET', 'POST'])
def reset_password():

    if 'reset_verified_email' not in session:
        return redirect(url_for('auth.forget_password'))

    email = session['reset_verified_email']

    if request.method == 'POST':
        pw = request.form.get('password')
        pw2 = request.form.get('confirm_password')

        passhash = generate_password_hash(pw)

        if pw != pw2:
            flash("Passwords do not match.", "error")
            return render_template('reset_password.html')

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE fd_user SET password=%s WHERE email=%s",
            (passhash, email)
        )
        conn.commit()
        cur.close()

        # clean up
        session.pop('reset_verified_email')
        flash("Password reset! Please log in.", "success")
        return redirect(url_for('auth.login'))

    return render_template('reset_password.html')

@auth.route('/logout')
def logout():
    session.clear()
    flash("You've been signed out.",'success')
    return redirect(url_for('auth.login'))

@auth.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    if 'user_id' not in session:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    user_id   = session['user_id']
    role_id   = session.get('role_id')
    role = 1
    form_action = request.form.get('form_action')

    conn = get_db_connection()
    cur  = conn.cursor()

    try:
        if form_action == 'request_admin':
            username = session.get('username')

            # prevent duplicate pending requests
            cur.execute(
                "SELECT status FROM admin_requests WHERE user_id = %s AND (status = 'Pending' OR status = 'Denied')",
                (user_id,)
            )
            if cur.fetchone():
                flash("You already have a pending admin request.", "warning")
            else:
                cur.execute(
                    "INSERT INTO admin_requests (user_id, username, status, role_id) VALUES (%s, %s, 'Pending', %s)",
                    (user_id, username, role)
                )
                conn.commit()
                flash("Admin access request submitted successfully.", "success")

        elif form_action == 'update_profile':
            full_name  = request.form['full_name']
            email      = request.form['email']
            designation= request.form['designation']
            dob        = request.form['dob']

            cur.execute(
                """
                UPDATE fd_user
                   SET full_name = %s,
                       email     = %s,
                       designation = %s,
                       dob       = %s
                 WHERE user_id = %s
                """,
                (full_name, email, designation, dob, user_id)
            )
            conn.commit()
            flash("Profile updated successfully!", "success")

        else:
            flash("Unknown action requested.", "error")

    except Exception as e:
        conn.rollback()
        flash(f"Database error: {e}", "error")
    finally:
        cur.close()
        conn.close()

    # send them back to their own dashboard
    target = 'views.admin_dashboard' if role_id == ADMIN_ROLE_ID else 'views.user_dashboard'
    return redirect(url_for(target, section='profile'))



@auth.route('/change_password', methods=['POST'])
@login_required
def change_password():

    if 'user_id' not in session:
        flash("Access denied.", "error")
        return redirect(url_for('auth.login'))

    user_id = session['user_id']
    role_id = session.get('role_id')

    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_new_password = request.form.get('confirm_new_password')

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True) # Use dictionary=True to fetch user by username

    # Fetch user's current hashed password
    cur.execute("SELECT password FROM fd_user WHERE user_id = %s", (user_id,))
    user = cur.fetchone()

    if not user:
        flash('User not found. Please log in again.', 'error')
        cur.close()
        conn.close()
        return redirect(url_for('auth.login'))

    # Verify the current password
    if not check_password_hash(user['password'], current_password):
        flash('Incorrect current password.', 'error')
        cur.close()
        conn.close()
        return redirect(url_for('views.user_dashboard', section='changePassword')) # Stay on a change password section

    # Validate new password
    if not new_password or len(new_password) < 6:
        flash('New password must be at least 6 characters.', 'error')
    elif new_password != confirm_new_password:
        flash('New password and confirmation do not match.', 'error')
    elif not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$', new_password):
        flash('Password must contain a letter and a number.', 'error')
    else:
        # All good → update
        hashed = generate_password_hash(new_password, method='pbkdf2:sha256')
        try:
            cur.execute("UPDATE fd_user SET password=%s WHERE user_id=%s", (hashed, user_id))
            conn.commit()
            session.clear()  # force re-login
            flash('Password changed! Please log in again.', 'success')
            return redirect(url_for('auth.login'))
        except Exception as e:
            conn.rollback()
            flash(f'Error updating password: {e}', 'error')

    cur.close()
    conn.close()

    return redirect(url_for('views.user_dashboard' if role_id==USER_ROLE_ID else 'views.admin_dashboard', section='changePassword')) # Redirect back to the change password section
