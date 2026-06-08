#!/bin/bash
# Script de déploiement pour PythonAnywhere
# Usage: bash deploy.sh

echo "=== Mise à jour du code ==="
git pull origin main

echo "=== Activation du venv ==="
python -m venv venv
source venv/bin/activate

echo "=== Installation des dépendances ==="
pip install -r requirements.txt

echo "=== Migrations ==="
python manage.py migrate

echo "=== Fichiers statiques ==="
python manage.py collectstatic --noinput

echo "=== Redémarrage de l'app ==="
touch /var/www/bah55oumar_pythonanywhere_com_wsgi.py

echo "=== Terminé ==="
