"""
Django settings for zzz project.

Generated by 'django-admin startproject' using Django 2.0.5.

For more information on this file, see
https://docs.djangoproject.com/en/2.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.0/ref/settings/
"""

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Location where files are stored 
MEDIA_ROOT = os.path.join(BASE_DIR, 'data', "files")

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.0/howto/deployment/checklist/

# 100 megabytes => WARNING: It may be vulnerable to DOS (Denial-Of-Service) attacks
# if this value is too high. 
# @TODO: Find a way to upload large files without loading everything to memory.
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024 * 100

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = '0ux_%=7!81&z=^uj5iw@tue#7zkfn9lk)=*d147(g+$5t$l9nz'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []

SITE_URL = "http://127.0.0.1:8000"

# Application definition

INSTALLED_APPS = [
      'django.contrib.admin'
    , 'django.contrib.auth'
    , 'django.contrib.contenttypes'
    , 'django.contrib.sessions'
    , 'django.contrib.messages'
    , 'django.contrib.staticfiles'

    , 'rest_framework'

    # Main app 
    , 'bookmarks'
    
    # DJango-pdb: note - require installing
    # $ pip install django-pdb
    # Reference: https://github.com/HassenPy/django-pdb
    , 'django_pdb'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # DJango-pdb: note - require installing
    # $ pip install django-pdb
    # Reference: https://github.com/HassenPy/django-pdb
    'django_pdb.middleware.PdbMiddleware',

]

# Call Pdb() on exception =>> See: https://github.com/HassenPy/django-pdb
POST_MORTEN = True 

ROOT_URLCONF = 'apps.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'apps.wsgi.application'


# Database
# https://docs.djangoproject.com/en/2.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'data', 'db.sqlite3'),
    }
}

# Password validation
# https://docs.djangoproject.com/en/2.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/2.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

# Allow connection from any hosts
ALLOWED_HOSTS = [ "*"]


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.0/howto/static-files/

STATIC_URL = '/static/'

STATICFILES_DIRS = [

    os.path.join(BASE_DIR, 'static'),

]

LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"

AUTH_USER_MODEL = "bookmarks.Account"