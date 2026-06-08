# EduManager - Système de Gestion d'École Privée

Application web complète pour la gestion des écoles privées (primaire, collège, lycée).

## Fonctionnalités principales

- **Gestion des utilisateurs** : Admin, Directeur, Secrétaire, Enseignant, Parent, Élève
- **Gestion des élèves** : Inscription, informations, attribution aux classes
- **Gestion des classes** : Création par cycle (primaire, collège, lycée)
- **Gestion des matières** : Attribution aux enseignants et classes
- **Gestion des notes** : Saisie, calcul de moyennes, bulletins
- **Gestion des absences** : Suivi des présences
- **Gestion des paiements** : Frais scolaires, historique, reçus
- **Communication** : Messages internes, notifications
- **Tableau de bord** : Statistiques et analyses

## Technologies utilisées

### Backend
- Python 3.x
- Django 6.0
- Django REST Framework
- PostgreSQL (prêt) / SQLite (développement)
- JWT Authentication

### Frontend
- React 18
- React Router DOM
- Axios
- Tailwind CSS
- Vite

## Installation et démarrage

### 1. Backend (Django)

```bash
cd /edumanager
venv/Scripts/activate
pip install -r requirements.txt  # (à créer)
python manage.py migrate
python manage.py runserver 8000
```

### 2. Frontend (React)

```bash
cd /edumanager/frontend
npm install
npm run dev
```

### 3. Démarrage rapide (Windows)

```powershell
cd /edumanager
./start_dev.ps1
```

## Configuration

### Base de données
Par défaut, SQLite est utilisé pour le développement. Pour utiliser PostgreSQL :

```bash
set USE_POSTGRESQL=true
set DB_NAME=edumanager_db
set DB_USER=postgres
set DB_PASSWORD=votre_mot_de_passe
set DB_HOST=localhost
set DB_PORT=5432
```

## Accès

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000/api
- **Admin Django** : http://localhost:8000/admin
  - Utilisateur : `admin`
  - Mot de passe : `admin123`

## Structure du projet

```
/edumanager
├── edumanager_project/    # Configuration Django principale
├── accounts/              # Gestion des utilisateurs
├── students/              # Gestion des élèves
├── teachers/              # Gestion des enseignants
├── classes/               # Gestion des classes et cycles
├── subjects/              # Gestion des matières
├── grades/                # Gestion des notes
├── attendance/            # Gestion des présences
├── payments/              # Gestion des paiements
├── communication/         # Messages et notifications
├── dashboard/             # Tableau de bord et statistiques
└── frontend/              # Application React (Vite)
```

## APIs disponibles

- `/api/accounts/token/` - Authentification JWT
- `/api/students/students/` - Gestion des élèves
- `/api/classes/classes/` - Gestion des classes
- `/api/subjects/subjects/` - Gestion des matières
- `/api/grades/grades/` - Gestion des notes
- `/api/attendance/attendance/` - Gestion des présences
- `/api/payments/payments/` - Gestion des paiements
- `/api/communication/messages/` - Messages
- `/api/dashboard/dashboard/` - Statistiques

## Prochaines étapes

1. Configurer PostgreSQL en production
2. Implémenter les formulaires complets de création/modification
3. Ajouter le système de bulletins PDF
4. Intégrer les paiements mobiles (Orange Money, MTN)
5. Développer l'application mobile (React Native)
