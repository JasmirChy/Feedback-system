from flask import Blueprint, render_template, url_for

views = Blueprint('views', __name__)

@views.route('/')
def index():
    return render_template('index.html')

@views.route('/user')
def user_dashboard():
    return render_template('user_dashboard.html')

@views.route('/admin')
def admin_dashboard():
    return render_template('admin_dashboard.html')

