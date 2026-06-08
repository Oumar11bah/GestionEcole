# Script pour démarrer les serveurs de développement EduManager
Write-Host "Démarrage des serveurs de développement..." -ForegroundColor Green

# Démarrer le backend Django en arrière-plan
Write-Host "Démarrage du backend Django sur le port 8000..." -ForegroundColor Yellow
Start-Process -FilePath "venv/Scripts/python.exe" -ArgumentList "manage.py", "runserver", "8000" -WorkingDirectory "/edumanager"

# Attendre quelques secondes pour que le backend démarre
Start-Sleep -Seconds 3

# Démarrer le frontend React dans un nouveau terminal
Write-Host "Démarrage du frontend React sur le port 3000..." -ForegroundColor Yellow
Start-Process -FilePath "npm.exe" -ArgumentList "run", "dev" -WorkingDirectory "/edumanager/frontend"

Write-Host "Serveurs démarrés !" -ForegroundColor Green
Write-Host "Backend API: http://localhost:8000/api" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Admin Django: http://localhost:8000/admin (admin/admin123)" -ForegroundColor Cyan
