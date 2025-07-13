# app/__init__.py
from flask import Flask, flash, redirect, url_for, render_template
from .extensions import limiter
from flask_session import Session
from werkzeug.exceptions import RequestEntityTooLarge
from app.models import init_db
from app.routes import auth, views, submit, admin


def create_app():
    app = Flask(__name__)

    # === Load config ===
    app.config.from_object('app.config')

    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max

    # === Initialize extensions ===
    Session(app)

    # === Initialize Database ===
    # This will only actually run once, inside the reloader child
    with app.app_context():
        init_db()

    # Error handler for large file uploads
    @app.errorhandler(413)
    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(e):
        flash("File too large! Max 10MB allowed.", "error")
        return redirect( url_for('views.user_dashboard', section='submitFeedback'))

    # ───── NEW rate‑limit handler ─────
    @app.errorhandler(429)
    def ratelimit_handler(e):
        # you can render login.html directly, or redirect & flash
        flash("Too many login attempts—please wait before trying again.", "error")
        return render_template("login.html"), 429

    # === Rate Limiter ===
    limiter.init_app(app)

    app.register_blueprint(views, url_prefix = '/')
    app.register_blueprint(auth, url_prefix = '/auth')
    app.register_blueprint(submit, url_prefix = '/submit')
    app.register_blueprint(admin, url_prefix = '/adminUser')


    return app