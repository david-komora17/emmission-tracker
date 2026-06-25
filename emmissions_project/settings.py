"""
Django settings for emmissions_project project.
"""

import os
import dotenv
import dj_database_url 
from datetime import timedelta
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
dotenv.load_dotenv(os.path.join(BASE_DIR, '.env'))

GROQ_API_KEY = os.environ.get('GROQ_API_KEY')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-jmkzhm(d%&$6*sq*n22&i85(6mlfd*4_u=j8@@yrd-yz$ckk_!')

# FIXED LANDMINE 2: Set DEBUG dynamically using Environment Variables
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# UPDATED: Replaced with .render.com 
ALLOWED_HOSTS = ['emmission-tracker.onrender.com', 'localhost', '127.0.0.1']
if os.environ.get('PRODUCTION_HOST'):
    ALLOWED_HOSTS.append(os.environ.get('PRODUCTION_HOST'))

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders', 
    'emmissions_app',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
]

# FIXED LANDMINE 3: Shifted WhiteNoiseMiddleware immediately below SecurityMiddleware
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # <-- Handles static files safely & fast
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

ROOT_URLCONF = 'emmissions_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# FIXED LANDMINE 1: Pay close attention to this package folder match name
WSGI_APPLICATION = 'emmissions_project.wsgi.application'


# If a DATABASE_URL is defined, always use it. This makes local testing
# consistent with deployments and avoids accidentally bypassing the remote
# database configuration just because DEBUG=True.
# Database Configuration
# Automatically switches between local testing and Railway production

if os.environ.get('RENDER') or os.environ.get('DATABASE_URL') and os.environ.get('DEBUG') == 'False':
    DATABASES = {
        'default': dj_database_url.config(
            conn_max_age=600,
            ssl_require=True  # Required for cloud databases
        )
    }
else:
    # Your clean, working local configuration
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'postgres',
            'USER': 'postgres',
            'PASSWORD': 'Dkomora17',
            'HOST': '127.0.0.1',
            'PORT': '5432',
        }
    }

# (Comment out or delete your previous if/else database logic for a moment)
# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# UPDATED: Explicitly retaining the "default" storage key alongside "staticfiles" 
# to comply directly with Django 6.x default file behavior.
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# CORS Configuration Whitelist Definitions
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Allow credentials if you handle session cookies or Authorization headers safely
CORS_ALLOW_CREDENTIALS = True