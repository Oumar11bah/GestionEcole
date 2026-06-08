from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import UserProfile

DEFAULT_ADMIN = {
    'username': 'admin',
    'email': 'admin@edumanager.com',
    'first_name': 'Administrateur',
    'last_name': 'Systeme',
    'password': 'admin123',
}

class Command(BaseCommand):
    help = 'Create default admin user and setup demo data'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('  EduManager - Configuration initiale'))
        self.stdout.write(self.style.SUCCESS('=' * 50))

        username = DEFAULT_ADMIN['username']

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'  [WARN] Utilisateur "{username}" existe deja'))
            user = User.objects.get(username=username)
            user.set_password(DEFAULT_ADMIN['password'])
            user.email = DEFAULT_ADMIN['email']
            user.first_name = DEFAULT_ADMIN['first_name']
            user.last_name = DEFAULT_ADMIN['last_name']
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'  [OK] Mot de passe de "{username}" reinitialise'))
        else:
            user = User.objects.create_superuser(
                username=DEFAULT_ADMIN['username'],
                email=DEFAULT_ADMIN['email'],
                password=DEFAULT_ADMIN['password'],
                first_name=DEFAULT_ADMIN['first_name'],
                last_name=DEFAULT_ADMIN['last_name'],
            )
            self.stdout.write(self.style.SUCCESS(f'  [OK] Administrateur "{username}" cree'))

        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.role = 'admin'
        profile.save()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('  Identifiants de connexion :'))
        self.stdout.write(self.style.SUCCESS(f'    Utilisateur : {DEFAULT_ADMIN["username"]}'))
        self.stdout.write(self.style.SUCCESS(f'    Mot de passe: {DEFAULT_ADMIN["password"]}'))
        self.stdout.write(self.style.SUCCESS(f'    Email       : {DEFAULT_ADMIN["email"]}'))
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('  Changez le mot de passe par defaut apres la premiere connexion !'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
