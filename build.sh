#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect Static Files
python manage.py collectstatic --no-input

# Run Database Migrations
python manage.py migrate