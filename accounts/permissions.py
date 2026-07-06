from rest_framework import permissions
from .utils import get_user_role, has_profile_access

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and get_user_role(request.user) == 'super_admin'

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return get_user_role(request.user) in ['super_admin', 'admin']

class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return get_user_role(request.user) in ['super_admin', 'admin']

class CanViewActivity(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return get_user_role(request.user) in ['super_admin', 'admin', 'directeur']

class CanManageStudents(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'students')

class CanManageTeachers(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'teachers')

class CanManagePayments(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'payments')

class CanManageGrades(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'grades')

class CanManageRooms(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'rooms')

class CanManageClasses(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'classes')

class CanManageAttendance(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'attendance')

class CanManageSchool(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return get_user_role(request.user) in ['super_admin', 'admin']

class CanManageSalaries(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return get_user_role(request.user) in ['super_admin', 'admin', 'comptable']

class CanExportData(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return has_profile_access(request.user, 'reports')

class RoleBasedPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        module = getattr(view, 'module', None)
        if not module:
            return True
        return has_profile_access(request.user, module)
