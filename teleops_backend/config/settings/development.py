"""
Development settings for Teleops Backend
"""

import os
from pathlib import Path
from datetime import timedelta

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from .base import *
from corsheaders.defaults import default_headers

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-development-secret-key-change-in-production'

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Remove django_ratelimit for development (doesn't work with locmem cache)
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'django_ratelimit']

# Database - Use PostgreSQL if configured, otherwise SQLite for development
if os.environ.get('DB_NAME'):
    # Use PostgreSQL if database environment variables are set
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'teleops'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {
                'sslmode': 'disable',  # Disable SSL for development
            },
        }
    }
else:
    # Fallback to SQLite for development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# CORS settings for development
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
]

CORS_ALLOW_ALL_ORIGINS = True  # Only for development

CORS_ALLOWED_HEADERS = list(default_headers) + [
    'x-tenant-id',
]

# Debug toolbar settings
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: True,
}

# Logging for development
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'teleops_dev.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'teleops': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Disable SSL redirect for development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Celery settings for development
CELERY_TASK_ALWAYS_EAGER = True  # Run tasks synchronously
CELERY_TASK_EAGER_PROPAGATES = True

# Cache settings for development - Use local memory cache instead of Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Static files for development
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Media files for development
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Disable password validation for development
AUTH_PASSWORD_VALIDATORS = []

# JWT settings for development
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=24),  # Longer tokens for development
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
})

# API rate limiting for development
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '1000/hour',
    'user': '10000/hour',
}

# Create logs directory if it doesn't exist
import os
os.makedirs(BASE_DIR / 'logs', exist_ok=True) 