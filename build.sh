#!/usr/bin/env bash
set -o errexit -o pipefail

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Node.js environment ==="
echo "node: $(node --version 2>&1)"
echo "npm: $(npm --version 2>&1)"
echo "PWD: $(pwd)"
echo "ls frontend/: $(ls -la frontend/ 2>&1)"

echo "=== Building frontend ==="
cd frontend
echo "CWD: $(pwd)"
npm install --legacy-peer-deps 2>&1
echo "npm install exit code: $?"
npm run build 2>&1
echo "npm run build exit code: $?"
echo "ls -la build/: $(ls -la build/ 2>&1)"
echo "ls -la .: $(ls -la . 2>&1)"
echo "=== Verifying frontend build ==="
if [ ! -f build/index.html ]; then
  echo "ERROR: build/index.html not found after npm run build!"
  pwd
  ls -la build/ 2>&1 || echo "build/ directory does not exist"
  exit 1
fi
echo "Frontend build OK: build/index.html exists"
cd ..

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput 2>&1

echo "=== Running migrations ==="
export USE_SQLITE_FALLBACK="${USE_SQLITE_FALLBACK:-true}"
export USE_POSTGRESQL="${USE_POSTGRESQL:-false}"
python manage.py migrate --run-syncdb 2>&1 || {
  echo "Database migration failed; retrying with SQLite fallback"
  export USE_SQLITE_FALLBACK=true
  export USE_POSTGRESQL=false
  export DATABASE_URL=""
  python manage.py migrate --run-syncdb 2>&1 || true
}

echo "=== Build complete ==="
echo "ls frontend/build/: $(ls -la frontend/build/ 2>&1)"
