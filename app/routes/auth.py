import random, datetime, mysql.connector
from datetime import datetime, timedelta
from flask import Blueprint, render_template, url_for, request, redirect, flash, session
from app.models.db import get_db_connection
from app.services.email import generate_unique_user_id, send_otp_email

auth = Blueprint('auth', __name__)


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']



        remember = 'remember_me' in request.form


        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT user_id, full_name, role_id FROM fd_user WHERE username = %s AND password = %s AND status = 1",
            (username, password)
        )
        user = cursor.fetchone()
        cursor.close()

        if not user:
            flash("Invalid username or password", "error")
            return render_template('login.html')

        # store minimal session info
        session['user_id'] = user['user_id']
        session['username'] = username
        session['full_name'] = user['full_name']
        session['role_id'] = user['role_id']

        # redirect based on role
        if user['role_id'] == 1:
            return redirect(url_for('views.admin_dashboard'))
        else:
            return redirect(url_for('views.user_dashboard'))



            # if they already have a valid session, skip the form
    if session.get('user_id'):
        if session.get('role_id') == 1:
            return redirect(url_for('views.admin_dashboard'))
        else:
            return redirect(url_for('views.user_dashboard'))

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

        # 1) Basic validations
        if password != confirm:
            flash("Passwords do not match.", "error")
            return render_template('signup.html')
        if not (email and full_name and user_name and password):
            flash("Please fill in all required fields.", "error")
            return render_template('signup.html')

        conn = get_db_connection()

        cur = conn.cursor()

        try:
            if user_type == 'studentStaff':
                # Verify ID exists in student_table or staff_table

                cur.execute(
                    'select 1 from student_table where student_id = %s union select 1 from staff_table where staff_id = %s',
                    (id_number, id_number))

                if cur.fetchone() is None:
                    if designation.capitalize() == "STUDENT":
                        flash("No such Student record found", 'error')
                    else:
                        flash("No such Staff record found", 'error')
                    return render_template('signup.html')


                cur.execute(
                    """insert into fd_user( user_id, full_name, username, password, email, designation, dob, role_id, status) values( %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (id_number, full_name, user_name, password, email, designation, d_o_b, role_id, status))

                conn.commit()

                flash("Account created!", "success")
                return redirect(url_for('auth.login'))

            else:
                # Public user: generate unique numeric ID & OTP

                user_id = generate_unique_user_id(cur)

                otp = f"{random.randint(0, 999999):06d}"
                expires_at = datetime.now() + timedelta(minutes=10)

                cur.execute(
                    """insert into email_verifications( email, otp, expires_at) values( %s, %s, %s) on duplicate key update otp=%s, expires_at=%s""",
                    (email, otp, expires_at, otp, expires_at))

                conn.commit()

                send_otp_email(email, otp)

                session['pending_user'] = {
                    'user_id': user_id,
                    'full_name': full_name,
                    'user_name': user_name,
                    'password': password,
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

        # OTP validation
        if entered_otp != stored_otp or datetime.utcnow() > expires_at:
            flash("Invalid or expired OTP. Please try again.", "error")
            # expired signup‐OTP → back to signup
            if flow_name == 'signup':
                return redirect(url_for('auth.signup'))
            # expired reset‐OTP → back to forgot password
            return redirect(url_for('auth.forget_password'))

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

    if request.method == 'POST':
        pw = request.form.get('password')
        pw2 = request.form.get('confirm_password')
        email = session['reset_verified_email']

        if pw != pw2:
            flash("Passwords do not match.", "error")
            return render_template('reset_password.html')

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE fd_user SET password=%s WHERE email=%s",
            (pw, email)
        )
        conn.commit()
        cur.close()

        # clean up
        session.pop('reset_verified_email')
        flash("Password reset! Please log in.", "success")
        return redirect(url_for('auth.login'))

    return render_template('reset_password.html')
