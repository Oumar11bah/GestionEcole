from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.profile.role == 'super_admin'

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.role in ['super_admin', 'admin']

class CanManageUsers(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.role in ['super_admin', 'admin']

class CanViewActivity(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.role in ['super_admin', 'admin', 'directeur']

class CanManageStudents(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('students')

class CanManageTeachers(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('teachers')

class CanManagePayments(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('payments')

class CanManageGrades(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('grades')

class CanManageRooms(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('rooms')

class CanManageClasses(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('classes')

class CanManageAttendance(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('attendance')

class CanManageSchool(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.role in ['super_admin', 'admin']

class CanManageSalaries(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.role in ['super_admin', 'admin', 'comptable']

class CanExportData(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.profile.can_access('reports')

class RoleBasedPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        profile = request.user.profile
        module = getattr(view, 'module', None)
        return profile.can_access(module) if module else True
