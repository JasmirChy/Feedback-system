from flask import Blueprint, render_template, url_for, request

auth = Blueprint('auth', __name__)


@auth.route('/login', methods=['GET', 'POST'])
def login():
    data = request.form
    user = request.form['username']
    password = request.form['password']
    if request.method == 'POST':

        return
    return render_template('login.html')


@auth.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        email = request.form.get('emil')
        full_name = request.form.get('fullname')
        id_number = request.form.get('idnumber')
        d_o_b = request.form.get('dob')
        designation = request.form.get('designation')
        user_name = request.form.get('username')
        password = request.form.get('password1')
        c_password = request.form.get('password2')
        pass
    return render_template('signup.html')
