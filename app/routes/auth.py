
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
        cursor = conn.cursor()

        try:
            if user_type == 'studentStaff':
                # Verify ID exists in student_table or staff_table
                cursor.execute(
                    'select 1 from student_table where student_id = %s union select 1 from staff_table where staff_id = %s',
                    (id_number, id_number))

                if cursor.fetchone() is None:
                    if designation.capitalize() == "STUDENT":
                        flash("No such Student record found", 'error')
                    else:
                        flash("No such Student record found", 'error')
                    return render_template('signup.html')

                cursor.execute("""insert into fd_user( user_id, full_name, username, password, email, designation, dob, role_id, status) values( %s, %s, %s, %s, %s, %s, %s, %s, %s)""", ( id_number, full_name, user_name, password, email, designation, d_o_b, role_id, status))

                conn.commit()

                flash("Account created!", "success")
                return redirect(url_for('auth.login'))

            else:
                # Public user: generate unique numeric ID & OTP
                user_id = generate_unique_user_id(cursor)

                otp = f"{random.randint(0,999999):06d}"
                expires_at = datetime.now() + timedelta(minutes=10)

                cursor.execute("""insert into email_verifications( email, otp, expires_at) values( %s, %s, %s) on duplicate key update otp=%s, expires_at=%s""", ( email, otp, expires_at, otp, expires_at))
                conn.commit()

                send_otp_email( email, otp)

                session['pending_user'] = {
                    'user_id': user_id,
                    'full_name': full_name,
                    'user_name': user_name,
                    'password': password,
                    'email': email,
                    'designation': 'General',
                    'dob' : d_o_b,
                    'role_id': role_id,
                    'status': status,
                    'otp' : otp,
                    'expires_at' : expires_at.isoformat()
                }

                return redirect(url_for('auth.verify_otp'))
        except mysql.connector.Error as err:
            flash(f'Database error: {err.msg}', 'error')
            return render_template('signup.html')

    return render_template('signup.html')


@auth.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    pending = session.get('pending_user')
    if not pending:
        flash("No pending signup found. Please sign up again.", "error")
        return redirect(url_for('auth.signup'))

    if request.method == 'POST':
        entered_otp = request.form.get('otp')
        stored_otp = pending.get('otp')
        expires_at_str = pending.get('expires_at')

        # Convert expires_at back to datetime
        try:
            expires_at = datetime.fromisoformat(expires_at_str)
        except ValueError:
            flash("Session expired or invalid data. Please sign up again.", "error")
            session.pop('pending_user', None)
            return redirect(url_for('auth.signup'))

        if entered_otp == stored_otp and datetime.utcnow() < expires_at:
            conn = get_db_connection()
            cursor = conn.cursor()

            try:
                cursor.execute("""
                    INSERT INTO fd_user (user_id, full_name, username, password, email, designation, dob, role_id, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    pending['user_id'],
                    pending['full_name'],
                    pending['user_name'],
                    pending['password'],
                    pending['email'],
                    pending['designation'],
                    pending['dob'],
                    pending['role_id'],
                    pending['status']
                ))
                conn.commit()
                session.pop('pending_user', None)  # clear session after success
                flash("Account created successfully!", "success")
                return redirect(url_for('auth.login'))
            except mysql.connector.Error as err:
                flash(f"Database error: {err.msg}", "error")
                return render_template('verify_otp.html')
        else:
            flash("Invalid or expired OTP. Please try again.", "error")
            return render_template('verify_otp.html')

    return render_template('verify_otp.html')
