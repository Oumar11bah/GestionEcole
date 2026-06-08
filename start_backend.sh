#!/bin/bash
cd /home/$(whoami)/GestionEcole
source venv/bin/activate
python manage.py migrate --run-syncdb
python manage.py collectstatic --noinput
python manage.py runserver 8000
