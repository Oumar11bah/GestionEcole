import os
import gzip
import shutil
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Restauration d\'une sauvegarde'

    def add_arguments(self, parser):
        parser.add_argument('backup_path', type=str, help='Chemin du dossier de sauvegarde')

    def handle(self, *args, **options):
        backup_path = options['backup_path']
        if not os.path.exists(backup_path):
            self.stderr.write(self.style.ERROR(f"Dossier introuvable: {backup_path}"))
            return

        self.stdout.write(self.style.WARNING("ATTENTION: La restauration va ÉCRASER les données existantes."))
        confirm = input("Tapez 'OUI' pour confirmer: ")
        if confirm != 'OUI':
            self.stdout.write("Restauration annulée.")
            return

        db_file = os.path.join(backup_path, 'database', 'db.json.gz')
        if os.path.exists(db_file):
            self.stdout.write("[1/2] Restauration de la base de données...")
            with gzip.open(db_file, 'rt', encoding='utf-8') as f:
                call_command('loaddata', stdin=f)
            self.stdout.write(self.style.SUCCESS("  -> Base restaurée"))

        media_backup = os.path.join(backup_path, 'media')
        if os.path.exists(media_backup):
            self.stdout.write("[2/2] Restauration des fichiers médias...")
            media_root = settings.MEDIA_ROOT
            if os.path.exists(media_root):
                shutil.rmtree(media_root)
            shutil.copytree(media_backup, media_root)
            self.stdout.write(self.style.SUCCESS("  -> Médias restaurés"))

        self.stdout.write(self.style.SUCCESS("Restauration terminée avec succès."))
