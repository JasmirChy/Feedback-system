# app/routes/auth.py
import random, mysql.connector, re
from datetime import datetime, timedelta
from flask import Blueprint, render_template, url_for, request, redirect, flash, session, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from app import limiter
from app.models import get_db_connection
from app.services.email import generate_unique_user_id, send_otp_email
from functools import wraps

auth = Blueprint('auth', __name__)
ADMIN_ROLE_ID = 1
USER_ROLE_ID = 2

LOCKOUT_ATTEMPTS = 3
LOCKOUT_MINUTES = 1

def role_required(role_id):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user_id = session.get('user_id')
            role = session.get('role_id')

            if not user_id or role != role_id:
                if not user_id:
                    flash("Please log in first.", "error")
                else:
                    flash("Access denied.", "error")
                return redirect(url_for('auth.login'))

            return f(*args, **kwargs)

        return wrapped

    return decorator


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
@limiter.limit("5 per 15 minutes")
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
        try:
            cursor.execute("""
                        SELECT user_id, full_name, role_id, password, failed_attempts, lock_until
                        FROM fd_user
                        WHERE BINARY username = %s AND status = 1
                    """, (username,))

            user = cursor.fetchone()
            if not user:
                flash("Invalid username.", "error")
                return render_template('login.html')

            now = datetime.utcnow()
            lock_until = user['lock_until']

            # Check if locked
            if lock_until:
                if now < lock_until:
                    remaining = (lock_until - now).seconds
                    flash(f"Too many failed attempts. Try again in {remaining} seconds.", "danger")
                    cursor.close()
                    return render_template('login.html')
                else:
                    # Lockout expired → reset counter
                    cursor.execute(
                        "UPDATE fd_user SET failed_attempts = 0, lock_until = NULL WHERE user_id = %s",
                        (user['user_id'],)
                    )
                    conn.commit()
                    user['failed_attempts'] = 0
                    user['lock_until'] = None

            if not check_password_hash(user['password'], password):
                # Increment failed attempts
                failed = user['failed_attempts'] + 1
                lock_until = None

                if failed >= LOCKOUT_ATTEMPTS:
                    lock_until = now + timedelta(minutes=LOCKOUT_MINUTES)
                    flash(f"Too many failed attempts. Try again after {LOCKOUT_MINUTES} minutes.", "danger")
                else:
                    flash("Invalid password.", "error")

                cursor.execute(
                    "UPDATE fd_user SET failed_attempts = %s, lock_until = %s WHERE user_id = %s",
                    (failed, lock_until, user['user_id'])
                )
                conn.commit()
                cursor.close()
                return render_template('login.html')

            # Password OK-reset attempts
            cursor.execute(
                "UPDATE fd_user SET failed_attempts = 0, lock_until = NULL WHERE user_id = %s",
                (user['user_id'],)
            )
            conn.commit()

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
        finally:
            # ensure resources closed
            cursor.close()
            conn.close()

    return render_template('login.html')


@auth.route('/signup', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
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

        # 1) Basic validations
        if password != confirm:
            flash("Passwords do not match.", "error")
            return render_template('signup.html')
        if not all([email, full_name, user_name, password]):
            flash("Please fill in all required fields.", "error")
            return render_template('signup.html')
        if len(password) < 8 or not re.match(r'^(?=.*[A-Za-z])(?=.*\d).+$', password):
            flash("Password must be at least 8 characters and include a letter and a number.", "error")
            return render_template('signup.html')

        passhash = generate_password_hash(password, 'pbkdf2:sha256')

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
                    """insert into fd_user( user_id, full_name, username, password, email, designation, type, dob, role_id, status) values( %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (id_number, full_name, user_name, passhash, email, designation, user_type, d_o_b, role_id, status))

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
                    'user_type': user_type,
                    'dob': d_o_b,
                    'role_id': role_id,
                    'status': status,
                    'otp': otp,
                    'expires_at': expires_at.isoformat()
                }

                return redirect(url_for('auth.verify_otp'))
        except mysql.connector.Error:
            current_app.logger.exception("DB error during signup")
            flash("Database error. Please try again later.", 'error')
            return render_template('signup.html')
        finally:
            cur.close()
            conn.close()

    return render_template('signup.html')


@auth.route('/verify-otp', methods=['GET', 'POST'])
@limiter.limit("10 per hour")
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
                    INSERT INTO fd_user (user_id, full_name, username, password, email, designation, type, dob, role_id, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    sign['user_id'],
                    sign['full_name'],
                    sign['user_name'],
                    sign['password'],
                    sign['email'],
                    sign['designation'],
                    sign['type'],
                    sign['dob'],
                    sign['role_id'],
                    sign['status']
                ))
                conn.commit()

                session.pop('pending_user', None)  # clear session after success
                flash("Account created successfully!", "success")
            except mysql.connector.Error:
                current_app.logger.exception("DB error inserting verified user")
                flash("Internal server error. Please try again later.", "error")
                return render_template('verify_otp.html')
            finally:
                cursor.close()
                conn.close()
            return redirect(url_for('auth.login'))
        else:
            # Mark that the user can now set a new password
            session.pop('reset_email', None)
            varified = context['email']
            session['reset_verified_email'] = varified
            return redirect(url_for('auth.reset_password'))
    return render_template('verify_otp.html')


@auth.route('/forget_password', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def forget_password():
    if request.method == 'POST':
        email = request.form.get('email')
        # verify this email exists

        conn = get_db_connection()
        cur = conn.cursor()
        try:
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

            send_otp_email(email, otp)
            session['reset_email'] = {
                'email': email,
                'otp': otp,
                'expires_at': expires.isoformat(),
                # we'll fill in 'new_password' later once they enter it
            }
            return redirect(url_for('auth.verify_otp'))
        except mysql.connector.Error:
            current_app.logger.exception("DB error in forget_password")
            flash("Internal error. Please try again later.", "error")
            return render_template('forget_password.html')
        finally:
            cur.close()
            conn.close()
    return render_template('forgot_password.html')


@auth.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    if 'reset_verified_email' not in session:
        return redirect(url_for('auth.forget_password'))

    email = session['reset_verified_email']

    if request.method == 'POST':
        pw = request.form.get('password')
        pw2 = request.form.get('confirm_password')

        if pw != pw2:
            flash("Passwords do not match.", "error")
            return render_template('reset_password.html')
        if len(pw) < 8 or not re.match(r'^(?=.*[A-Za-z])(?=.*\d).+$', pw):
            flash("Password must be at least 8 characters and include a letter and a number.", "error")
            return render_template('reset_password.html')

        passhash = generate_password_hash(pw)

        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "UPDATE fd_user SET password=%s WHERE email=%s",
                (passhash, email)
            )
            conn.commit()
        except mysql.connector.Error:
            current_app.logger.exception("DB error updating password")
            flash("Internal error. Please try again later.", "error")
            return render_template('reset_password.html')
        finally:
            cur.close()
            conn.close()

        # clean up
        session.pop('reset_verified_email')
        flash("Password reset! Please log in.", "success")
        return redirect(url_for('auth.login'))

    return render_template('reset_password.html')


@auth.route('/logout')
def logout():
    session.clear()
    flash("You've been signed out.", 'success')
    return redirect(url_for('auth.login'))


@auth.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    user_id = session['user_id']
    role_id = session.get('role_id')
    action = request.form.get('form_action')

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        if action == 'request_admin':
            # Prevent duplicate pending requests
            cur.execute(
                "SELECT 1 FROM admin_requests WHERE user_id=%s AND status IN ('Pending','Denied')",
                (user_id,)
            )
            if cur.fetchone():
                flash("You already have a pending admin request.", "warning")
            else:
                cur.execute(
                    "INSERT INTO admin_requests (user_id, username, status, role_id) "
                    "VALUES (%s, %s, 'Pending', %s)",
                    (user_id, session['username'], ADMIN_ROLE_ID)
                )
                flash("Admin access request submitted successfully.", "success")

        elif action == 'update_profile':
            full_name = request.form['full_name']
            email = request.form['email']
            designation = request.form['designation']
            dob = request.form['dob']

            cur.execute(
                """
                UPDATE fd_user
                   SET full_name  = %s,
                       email      = %s,
                       designation= %s,
                       dob        = %s
                 WHERE user_id   = %s
                """,
                (full_name, email, designation, dob, user_id)
            )
            flash("Profile updated successfully!", "success")

        else:
            flash("Unknown action requested.", "error")

        conn.commit()

    except mysql.connector.Error :
        # Log err.msg in real app
        conn.rollback()
        current_app.logger.exception("DB error in update_profile")
        flash("Internal error while updating profile.", "error")
    finally:
        cur.close()
        conn.close()
    target = 'views.admin_dashboard' if role_id == ADMIN_ROLE_ID else 'views.user_dashboard'
    return redirect(url_for(target, section='profile'))


@auth.route('/change_password', methods=['POST'])
@login_required
def change_password():
    user_id = session['user_id']
    role_id = session.get('role_id')

    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    confirm_new_password = request.form.get('confirm_new_password')

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)  # Use dictionary=True to fetch user by username

    # Fetch user's current hashed password
    cur.execute("SELECT password FROM fd_user WHERE user_id = %s", (user_id,))
    user = cur.fetchone()

    if not user:
        flash('User not found. Please log in again.', 'error')

        return redirect(url_for('auth.login'))

    if current_password is None:
        flash("Please! Enter the current password", "error")
        return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard',
                                section='changePassword'))
    elif current_password.strip() == '':
        flash("Please! Enter the current password", "error")
        return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard',
                                section='changePassword'))

    if new_password is None:
        flash("Please! Enter the new password", "error")
        return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard',
                                section='changePassword'))
    elif new_password.strip() == '':
        flash("Please! Enter the new password", "error")
        return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard',
                                section='changePassword'))

    if confirm_new_password is None:
        flash("Please! Enter the confirm new password", "error")
        return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard',
                                section='changePassword'))
    elif confirm_new_password.strip() == '':
        flash("Please! Enter the confirm new password", "error")
        return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard',
                                section='changePassword'))

    # Verify the current password
    if not check_password_hash(user['password'], current_password):
        flash('Incorrect current password.', 'error')
        cur.close()
        conn.close()
        return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard',
                                section='changePassword'))  # Stay on a change password section

    # Validate new password
    if current_password == new_password == confirm_new_password:
        flash('Old password can\'t be used again.', 'error')
    elif not new_password or len(new_password) < 8:
        flash('New password must be at least 8 characters.', 'error')
    elif new_password != confirm_new_password:
        flash('New password and conformation do not match.', 'error')
    elif not re.match(r'^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$', new_password):
        flash('Password must contain a letter and a number and be at least 8 characters.', 'error')
    else:
        # All good → update
        hashed = generate_password_hash(new_password, method='pbkdf2:sha256')
        try:
            cur.execute("UPDATE fd_user SET password=%s WHERE user_id=%s", (hashed, user_id))
            conn.commit()
            session.clear()  # force re-login
            flash('Password changed! Please log in again.', 'success')
            return redirect(url_for('auth.login'))
        except mysql.connector.Error:
            conn.rollback()
            current_app.logger.exception("DB error updating password")
            flash('Error updating password', 'error')

    cur.close()
    conn.close()

    return redirect(url_for('views.user_dashboard' if role_id == USER_ROLE_ID else 'views.admin_dashboard', section='changePassword'))  # Redirect back to the change password section
