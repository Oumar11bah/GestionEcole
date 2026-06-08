import os
import json
import gzip
import shutil
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Sauvegarde complète de la base de données et des fichiers médias'

    def add_arguments(self, parser):
        parser.add_argument('--output', type=str, help='Dossier de destination pour la sauvegarde')
        parser.add_argument('--keep', type=int, default=30, help='Nombre de sauvegardes à conserver (défaut: 30)')

    def handle(self, *args, **options):
        backup_dir = options.get('output') or os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = os.path.join(backup_dir, f'backup_{timestamp}')

        self.stdout.write(f"[1/3] Sauvegarde de la base de données...")
        db_path = os.path.join(backup_path, 'database')
        os.makedirs(db_path, exist_ok=True)
        db_file = os.path.join(db_path, 'db.json.gz')
        with gzip.open(db_file, 'wt', encoding='utf-8') as f:
            call_command('dumpdata', stdout=f, exclude=['contenttypes', 'auth.Permission'])
        self.stdout.write(self.style.SUCCESS(f"  -> Base sauvegardée: {db_file}"))

        self.stdout.write(f"[2/3] Sauvegarde des fichiers médias...")
        media_root = settings.MEDIA_ROOT
        if os.path.exists(media_root):
            media_backup = os.path.join(backup_path, 'media')
            shutil.copytree(media_root, media_backup)
            self.stdout.write(self.style.SUCCESS(f"  -> Médias sauvegardés: {media_backup}"))

        self.stdout.write(f"[3/3] Nettoyage des anciennes sauvegardes...")
        keep_count = options.get('keep')
        all_backups = sorted([
            d for d in os.listdir(backup_dir)
            if d.startswith('backup_') and os.path.isdir(os.path.join(backup_dir, d))
        ])
        while len(all_backups) > keep_count:
            old = all_backups.pop(0)
            shutil.rmtree(os.path.join(backup_dir, old))
            self.stdout.write(f"  -> Suppression: {old}")

        manifest = {
            'timestamp': timestamp,
            'database': 'db.json.gz',
            'media': 'media',
        }
        with open(os.path.join(backup_path, 'manifest.json'), 'w') as f:
            json.dump(manifest, f, indent=2)

        self.stdout.write(self.style.SUCCESS(f"\nSauvegarde terminée: {backup_path}"))
        self.stdout.write(f"Taille: {self._get_size(backup_path):.2f} MB")

    def _get_size(self, path):
        total = 0
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                total += os.path.getsize(fp)
        return total / (1024 * 1024)
