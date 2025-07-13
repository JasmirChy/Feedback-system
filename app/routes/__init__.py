# app/routes/__init__.py

# Import blueprints so that they get registered when we do

from .auth import auth
from .views import views
from .submit import submit
from .admin import admin

__all__ = ["auth", "views", "submit", "admin"]
