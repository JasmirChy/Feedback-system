from flask import Flask
from flask_session import Session


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'a7agbdas982 2897g2   2873299 sdvsb'
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_PERMANENT'] = False

    Session(app)

    from app.routes.views import views
    from app.routes.auth import auth

    app.register_blueprint(views, url_prefix = '/')
    app.register_blueprint(auth, url_prefix ='/')

    return app

