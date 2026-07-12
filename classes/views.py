import datetime as dt
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import IntegrityError, models
from .models import Cycle, Class, ScheduleEntry
from .serializers import CycleSerializer, ClassSerializer, ScheduleEntrySerializer
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from accounts.permissions import CanManageClasses
from accounts.utils import TenantAwareMixin, get_user_role, get_request_tenant

class CycleViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Cycle.objects.all()
    serializer_class = CycleSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), CanManageClasses()]

    def get_queryset(self):
        role = get_user_role(self.request.user)
        if role == 'super_admin':
            return Cycle.objects.none()
        tenant = get_request_tenant(self.request)
        if tenant:
            tenant_cycles = Cycle.objects.filter(tenant=tenant)
            tenant_cycle_names = set(tenant_cycles.values_list('name', flat=True))
            global_cycles = Cycle.objects.filter(tenant__isnull=True).exclude(
                name__in=tenant_cycle_names
            )
            return (tenant_cycles | global_cycles).order_by('name').distinct()
        return Cycle.objects.filter(tenant__isnull=True).order_by('name')

class ClassViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Class.objects.select_related('cycle').all()
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticated, CanManageClasses]
    pagination_class = None  # Disable pagination for classes

    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(self, 'request'):
            cycle = self.request.query_params.get('cycle', None)
            if cycle:
                queryset = queryset.filter(cycle__name=cycle)
        return queryset
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError as e:
            return Response(
                {'detail': 'Le nom que vous avez tape a ete deja saisi'},
                status=400
            )
    
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except IntegrityError as e:
            return Response(
                {'detail': 'Le nom que vous avez tape a ete deja saisi'},
                status=400
            )

class ScheduleEntryViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = ScheduleEntry.objects.all()
    serializer_class = ScheduleEntrySerializer
    permission_classes = [IsAuthenticated, CanManageClasses]

    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(self, 'request'):
            class_id = self.request.query_params.get('class_id', None)
            if class_id:
                queryset = queryset.filter(class_assigned_id=class_id)
        return queryset

    def perform_create(self, serializer):
        super().perform_create(serializer)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=False, methods=['post'])
    def check_conflicts(self, request):
        data = request.data
        errors = []
        day = data.get('day')
        start_str = data.get('start_time')
        end_str = data.get('end_time')
        room = data.get('room', '')
        teacher_name = data.get('teacher_name', '')
        class_assigned_id = data.get('class_assigned_id')
        exclude_id = data.get('exclude_id')

        if not all([day, start_str, end_str]):
            return Response({'available': False, 'errors': ['Jour et horaires requis']})

        start_time = dt.datetime.strptime(start_str, '%H:%M').time()
        end_time = dt.datetime.strptime(end_str, '%H:%M').time()

        if start_time >= end_time:
            return Response({'available': False, 'errors': ["L'heure de fin doit être après l'heure de début"]})

        if room:
            room_qs = ScheduleEntry.objects.filter(day=day, room=room)
            if exclude_id:
                room_qs = room_qs.exclude(id=exclude_id)
            for entry in room_qs:
                if start_time < entry.end_time and entry.start_time < end_time:
                    errors.append({
                        'type': 'room',
                        'message': f"Salle déjà occupée : {room}",
                        'detail': f"{entry.subject_name} - {entry.class_assigned} ({entry.start_time:%Hh%M}-{entry.end_time:%Hh%M})",
                    })
                    break

        if teacher_name:
            teacher_qs = ScheduleEntry.objects.filter(day=day, teacher_name=teacher_name)
            if exclude_id:
                teacher_qs = teacher_qs.exclude(id=exclude_id)
            for entry in teacher_qs:
                if start_time < entry.end_time and entry.start_time < end_time:
                    errors.append({
                        'type': 'teacher',
                        'message': f"Enseignant déjà occupé : {teacher_name}",
                        'detail': f"{entry.subject_name} - {entry.class_assigned} ({entry.start_time:%Hh%M}-{entry.end_time:%Hh%M})",
                    })
                    break

        if class_assigned_id:
            class_qs = ScheduleEntry.objects.filter(day=day, class_assigned_id=class_assigned_id)
            if exclude_id:
                class_qs = class_qs.exclude(id=exclude_id)
            for entry in class_qs:
                if start_time < entry.end_time and entry.start_time < end_time:
                    errors.append({
                        'type': 'class',
                        'message': "Classe déjà occupée",
                        'detail': f"{entry.subject_name} ({entry.start_time:%Hh%M}-{entry.end_time:%Hh%M})",
                    })
                    break

        return Response({
            'available': len(errors) == 0,
            'errors': errors,
        })

    @action(detail=False, methods=['post'])
    def available_slots(self, request):
        data = request.data
        day = data.get('day')
        room = data.get('room', '')
        teacher_name = data.get('teacher_name', '')
        class_assigned_id = data.get('class_assigned_id')
        duration_minutes = int(data.get('duration_minutes', 60))
        exclude_id = data.get('exclude_id')

        if not day:
            return Response({'slots': []})

        busy_ranges = []

        if room:
            for e in ScheduleEntry.objects.filter(day=day, room=room).exclude(id=exclude_id):
                busy_ranges.append((e.start_time, e.end_time, 'room'))
        if teacher_name:
            for e in ScheduleEntry.objects.filter(day=day, teacher_name=teacher_name).exclude(id=exclude_id):
                busy_ranges.append((e.start_time, e.end_time, 'teacher'))
        if class_assigned_id:
            for e in ScheduleEntry.objects.filter(day=day, class_assigned_id=class_assigned_id).exclude(id=exclude_id):
                busy_ranges.append((e.start_time, e.end_time, 'class'))

        busy_ranges.sort()
        merged = []
        for start, end, typ in busy_ranges:
            if merged and start < merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))

        day_start = dt.time(7, 0)
        day_end = dt.time(19, 0)
        slots = []
        current = day_start
        for b_start, b_end in merged:
            while current < b_start:
                cur_dt = dt.datetime.combine(dt.date.today(), current)
                cand_end = (cur_dt + dt.timedelta(minutes=duration_minutes)).time()
                if cand_end <= b_start:
                    slots.append(f"{current:%H:%M}-{cand_end:%H:%M}")
                current = cand_end
            current = max(current, b_end)
        while current < day_end:
            cur_dt = dt.datetime.combine(dt.date.today(), current)
            cand_end = (cur_dt + dt.timedelta(minutes=duration_minutes)).time()
            if cand_end <= day_end:
                slots.append(f"{current:%H:%M}-{cand_end:%H:%M}")
            current = cand_end

        return Response({'slots': slots})
