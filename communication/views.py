from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from .models import Message, Notification
from .serializers import MessageSerializer, NotificationSerializer
from accounts.permissions import IsAdminOrSuperAdmin
from accounts.utils import get_user_role


def _get_tenant_filter(user):
    role = get_user_role(user)
    if role == 'super_admin':
        return {'pk__in': []}  # no results
    if hasattr(user, 'profile') and user.profile.tenant:
        return {'recipient__profile__tenant': user.profile.tenant}
    return {'recipient': None}  # no results


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get_queryset(self):
        tenant_filter = _get_tenant_filter(self.request.user)
        queryset = Message.objects.filter(**tenant_filter)
        recipient_id = self.request.query_params.get('recipient_id', None)
        sender_id = self.request.query_params.get('sender_id', None)
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)
        if sender_id:
            queryset = queryset.filter(sender_id=sender_id)
        return queryset


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'send_bulk']:
            return [IsAuthenticated(), IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        tenant_filter = _get_tenant_filter(user)
        if get_user_role(user) in ['super_admin', 'admin']:
            queryset = Notification.objects.filter(**tenant_filter)
        else:
            queryset = Notification.objects.filter(recipient=user)
        recipient_id = self.request.query_params.get('recipient_id', None)
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)
        return queryset

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        recipient_id = request.data.get('recipient_id', request.user.id)
        tenant_filter = _get_tenant_filter(request.user)
        qs = Notification.objects.filter(recipient_id=recipient_id, is_read=False, **tenant_filter)
        if get_user_role(request.user) not in ['super_admin', 'admin']:
            qs = qs.filter(recipient=request.user)
        qs.update(is_read=True)
        return Response({'status': 'all marked as read'})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user and get_user_role(request.user) not in ['super_admin', 'admin']:
            return Response({'error': 'Permission refusée'}, status=403)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        recipient_id = request.query_params.get('recipient_id', request.user.id)
        tenant_filter = _get_tenant_filter(request.user)
        qs = Notification.objects.filter(recipient_id=recipient_id, is_read=False, **tenant_filter)
        if get_user_role(request.user) not in ['super_admin', 'admin']:
            qs = qs.filter(recipient=request.user)
        count = qs.count()
        return Response({'count': count})

    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        title = request.data.get('title')
        message = request.data.get('message')
        notification_type = request.data.get('notification_type', 'general')
        target_role = request.data.get('target_role')

        if not title or not message:
            return Response({'error': 'title and message required'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        tenant = None
        if get_user_role(user) != 'super_admin':
            tenant = getattr(getattr(user, 'profile', None), 'tenant', None)
        users = User.objects.filter(is_active=True)
        if tenant:
            users = users.filter(profile__tenant=tenant)
        if target_role and target_role != 'all':
            users = users.filter(profile__role=target_role)

        notifications = []
        for u in users:
            notifications.append(Notification(
                recipient=u,
                notification_type=notification_type,
                title=title,
                message=message,
                is_read=False,
            ))

        Notification.objects.bulk_create(notifications)

        return Response({
            'status': f'Notification envoyée à {len(notifications)} utilisateur(s)',
            'count': len(notifications),
        })
