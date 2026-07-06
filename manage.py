#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def _ensure_venv():
    """If we are NOT running from the project's virtual environment, re-exec with venv Python."""
    base = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(base, 'venv', 'Scripts', 'python.exe')
    if os.path.isfile(venv_python) and sys.executable.lower() != venv_python.lower():
        import subprocess
        sys.exit(subprocess.call([venv_python] + sys.argv, cwd=base))


def main():
    _ensure_venv()
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
