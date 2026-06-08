from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Room
from .serializers import RoomSerializer
from accounts.permissions import CanManageClasses

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated, CanManageClasses]
    pagination_class = None
    filterset_fields = ['room_type', 'status', 'building']
