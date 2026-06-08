from django.contrib import admin
from .models import Term, Grade, GradeHistory, StudentAverage

@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ['name', 'academic_year', 'is_active']

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ['student', 'teacher_subject', 'term', 'average']
    list_filter = ['term', 'teacher_subject__subject']

@admin.register(GradeHistory)
class GradeHistoryAdmin(admin.ModelAdmin):
    list_display = ['grade', 'user', 'field_name', 'created_at']
    list_filter = ['field_name', 'created_at']

@admin.register(StudentAverage)
class StudentAverageAdmin(admin.ModelAdmin):
    list_display = ['student', 'term', 'average', 'rank']
