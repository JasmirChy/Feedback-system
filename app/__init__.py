from flask import Flask
from flask_session import Session
from app.models.db import init_db
from app.routes import auth,views


def create_app():
    app = Flask(__name__)

    # === Load config ===
    app.config.from_object('app.config')

    # === Initialize extensions ===
    Session(app)

    # === Initialize Database ===
    # This will only actually run once, inside the reloader child
    with app.app_context():
        from app.models.db import init_db
        init_db()

    # === Register Blueprints ===
    from app.routes.views import views
    from app.routes.auth import auth

    app.register_blueprint(views, url_prefix = '/')
    app.register_blueprint(auth, url_prefix ='/')


    return app