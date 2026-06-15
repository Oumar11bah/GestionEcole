#!/usr/bin/env bash
set -o errexit -o pipefail

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Building frontend ==="
cd frontend
npm install --legacy-peer-deps
npm run build
echo "=== Verifying frontend build ==="
if [ ! -f build/index.html ]; then
  echo "ERROR: build/index.html not found after npm run build!"
  exit 1
fi
echo "Frontend build OK: build/index.html exists"
cd ..

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput

echo "=== Running migrations ==="
python manage.py migrate --run-syncdb

echo "=== Build complete ==="
