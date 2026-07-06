from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Room
from .serializers import RoomSerializer
from accounts.permissions import CanManageRooms
from accounts.utils import TenantAwareMixin

class RoomViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated, CanManageRooms]
    pagination_class = None
    filterset_fields = ['room_type', 'status', 'building']