# app/extensions.py
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])

cache = Cache(config={
    "CACHE_TYPE": "simple",    # in‑memory; switch to “redis” in prod
    "CACHE_DEFAULT_TIMEOUT": 300,  # 5 minutes
})