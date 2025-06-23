
import random, mysql.connector
from datetime import datetime, timedelta
from flask import Blueprint, render_template, url_for, request, redirect, flash, session
from app.models.db import get_db_connection
from app.services.email import generate_unique_user_id, send_otp_email

auth = Blueprint('auth', __name__)


@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = request.form['username']
        password = request.form['password']
        if user == 'user' and password == 'user123':
            return redirect(url_for('views.user_dashboard'))
        elif user == 'admin' and password == 'admin123':
            return redirect(url_for('views.admin_dashboard'))
        else:
            return render_template('login.html')
    return render_template('login.html')


@auth.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.form
        user_type = data.get('usertype')
        email = data.get('emil')
        full_name = data.get('fullname')
        id_number = data.get('idnumber')
        d_o_b = data.get('dob')
        designation = data.get('designation')
        user_name = data.get('username')
        password = data.get('password1')
        role_id = 2
        status = 1

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            if user_type == 'studentStaff':
                user_id = id_number
                designation_user = designation

                cursor.execute(
                    'select 1 from student_table where student_id = %s union select 1 from staff_table where staff_id = %s',
                    (user_id, user_id))

                if cursor.fetchone() is None:
                    if designation_user.capitalize() == "STUDENT":
                        flash("No such Student record found", 'error')
                    else:
                        flash("No such Student record found", 'error')
                    return render_template('signup.html')

                cursor.execute("""insert into fd_user( user_id, full_name, username, password, email, designation, dob, role_id, status) values( %s, %s, %s, %s, %s, %s, %s, %s, %s)""", ( user_id, full_name, user_name, password, email, designation, d_o_b, role_id, status))

                flash("Account created!", "success")
                return redirect(url_for('auth.login'))

            else:
                user_id = generate_unique_user_id(cursor)

                otp = f"{random.randint(0,999999):06d}"
                expires_at = datetime.utcnow() + timedelta(minutes=10)

                cursor.execute("""insert into email_verifications( email, otp, expires_at) values( %s, %s, %s) on duplicate key update otp=%s, expires_at=%s""", ( email, otp, expires_at, otp, expires_at))
                conn.commit()

                send_otp_email( email, otp)

                session['pending_user'] = {
                    'user_id': user_id,
                    'full_name': full_name,
                    'user_name': user_name,
                    'password': password,
                    'email': email,
                    'role_id': role_id,
                    'status': status
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
        return redirect(url_for('auth.signup'))

    if request.method == 'POST':
        entered_otp = request.form.get('otp')
        stored_otp = pending.get('otp')
        expires_at = pending.get('expires_at')

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
                flash("Account created successfully!", "success")
                return redirect(url_for('auth.login'))
            except mysql.connector.Error as err:
                flash(f"Database error: {err.msg}", "error")
                return render_template('verify_otp.html')
        else:
            flash("Invalid or expired OTP. Please try again.", "error")
            return render_template('verify_otp.html')

    return render_template('verify_otp.html')
