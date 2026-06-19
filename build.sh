#!/usr/bin/env bash
# exit on error
set -o errexit

# Upgrade pip and install requirements
python -m pip install --upgrade pip
pip install -r requirements.txt

# Collect static files for WhiteNoise
python manage.py collectstatic --noinput

# Run database migrations against Supabase
python manage.py migrate --noinput