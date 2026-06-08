#!/usr/bin/env python
import os
import sys
import django

sys.path.append('/edumanager')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'GestionEcole.settings')
django.setup()

from school.models import AcademicYear
from django.contrib.auth.models import User
from classes.models import Cycle, Class
from teachers.models import Teacher
from students.models import Student, Parent
from subjects.models import Subject
from grades.models import Term

def populate():
    print("Creating academic years...")
    AcademicYear.objects.get_or_create(name='2024-2025', defaults={'is_active': True})
    AcademicYear.objects.get_or_create(name='2025-2026')

    print("Creating cycles...")
    cycles_data = [
        ('primaire', 'Primaire'),
        ('college', 'Collège'),
        ('lycee', 'Lycée'),
    ]
    for code, _ in cycles_data:
        Cycle.objects.get_or_create(name=code)
    
    print("Creating classes...")
    cp, _ = Class.objects.get_or_create(name='CP', cycle=Cycle.objects.get(name='primaire'), defaults={'academic_year': '2024-2025'})
    ce1, _ = Class.objects.get_or_create(name='CE1', cycle=Cycle.objects.get(name='primaire'), defaults={'academic_year': '2024-2025'})
    sixieme, _ = Class.objects.get_or_create(name='6ème', cycle=Cycle.objects.get(name='college'), defaults={'academic_year': '2024-2025'})
    cinquieme, _ = Class.objects.get_or_create(name='5ème', cycle=Cycle.objects.get(name='college'), defaults={'academic_year': '2024-2025'})
    seconde, _ = Class.objects.get_or_create(name='Seconde', cycle=Cycle.objects.get(name='lycee'), defaults={'academic_year': '2024-2025'})
    terminale, _ = Class.objects.get_or_create(name='Terminale', cycle=Cycle.objects.get(name='lycee'), defaults={'academic_year': '2024-2025'})
    
    print("Creating subjects...")
    math, _ = Subject.objects.get_or_create(code='MATH', defaults={'name': 'Mathématiques', 'coefficient': 2})
    francais, _ = Subject.objects.get_or_create(code='FRAN', defaults={'name': 'Français', 'coefficient': 2})
    anglais, _ = Subject.objects.get_or_create(code='ANGL', defaults={'name': 'Anglais', 'coefficient': 2})
    physique, _ = Subject.objects.get_or_create(code='PHYS', defaults={'name': 'Physique', 'coefficient': 3})
    svt, _ = Subject.objects.get_or_create(code='SVT', defaults={'name': 'SVT', 'coefficient': 3})
    
    # Add cycles to subjects
    all_cycles = Cycle.objects.all()
    for subject in [math, francais, anglais, physique, svt]:
        subject.cycle.set(all_cycles)
    
    print("Creating terms...")
    term, _ = Term.objects.get_or_create(name='Trimestre 1', defaults={'academic_year': '2024-2025', 'start_date': '2024-09-01', 'end_date': '2024-12-31'})
    Term.objects.get_or_create(name='Semestre 2', defaults={'academic_year': '2024-2025', 'start_date': '2025-01-06', 'end_date': '2025-06-30', 'is_active': True})
    Term.objects.get_or_create(name='Composition', defaults={'academic_year': '2024-2025', 'start_date': '2025-07-01', 'end_date': '2025-07-31', 'is_active': True})
    
    print("Creating test teacher...")
    teacher_user, _ = User.objects.get_or_create(username='teacher1', defaults={'first_name': 'Amadou', 'last_name': 'Diallo', 'email': 'teacher@example.com'})
    teacher, _ = Teacher.objects.get_or_create(matricule='T001', defaults={
        'user': teacher_user,
        'first_name': 'Amadou',
        'last_name': 'Diallo',
        'gender': 'M',
        'date_of_birth': '1980-01-01',
        'phone_number': '12345678'
    })
    
    print("Creating test parent...")
    parent, _ = Parent.objects.get_or_create(full_name='Mamadou Diallo', defaults={
        'phone_number': '87654321',
        'email': 'parent@example.com'
    })
    
    print("Creating test student...")
    student, _ = Student.objects.get_or_create(matricule='', defaults={
        'first_name': 'Ibrahim',
        'last_name': 'Diallo',
        'gender': 'M',
        'date_of_birth': '2010-05-15',
        'parent': parent,
        'class_assigned': cp
    })
    
    print("Data populated successfully!")
    print(f"Cycles: {Cycle.objects.count()}")
    print(f"Classes: {Class.objects.count()}")
    print(f"Subjects: {Subject.objects.count()}")
    print(f"Students: {Student.objects.count()}")
    print(f"Teachers: {Teacher.objects.count()}")

if __name__ == '__main__':
    populate()
