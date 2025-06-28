# Import blueprints so that they get registered when we do
# `from app.routes import auth, views`

from .auth import auth
from .views import views
from .submit import submit

__all__ = ["auth", "views", "submit"]
