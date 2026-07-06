import os
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from accounts.permissions import CanManageStudents, CanManageTeachers
from accounts.utils import get_user_role, has_profile_access


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_protected_file(request, path):
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    if not os.path.exists(file_path):
        raise Http404("Fichier introuvable")
    if not os.path.normpath(file_path).startswith(os.path.normpath(settings.MEDIA_ROOT)):
        raise Http404("Accès refusé")
    dir_name = os.path.basename(os.path.dirname(path))
    if dir_name == 'students':
        if not has_profile_access(request.user, 'students'):
            from django.http import HttpResponseForbidden
            return HttpResponseForbidden("Accès non autorisé")
    elif dir_name == 'profiles':
        if get_user_role(request.user) not in ['super_admin', 'admin']:
            from django.http import HttpResponseForbidden
            return HttpResponseForbidden("Accès non autorisé")
    return FileResponse(open(file_path, 'rb'))
