import os
import sys

project_home = '/home/bah5518oumar/Gestion_Ecole'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Virtual environment
venv_path = '/home/bah5518oumar/.virtualenvs/gestion_ecole/lib/python3.12/site-packages'
if os.path.exists(venv_path):
    sys.path.insert(0, venv_path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'GestionEcole.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
