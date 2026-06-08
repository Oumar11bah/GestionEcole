from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Q
from .models import ClassResult
from .serializers import ClassResultSerializer
from grades.models import StudentAverage, Grade
from students.models import Student
from accounts.permissions import CanManageGrades, CanExportData

class ClassResultViewSet(viewsets.ModelViewSet):
    queryset = ClassResult.objects.all()
    serializer_class = ClassResultSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CanManageGrades]

    def get_queryset(self):
        qs = ClassResult.objects.all()
        class_id = self.request.query_params.get('class_assigned')
        term_id = self.request.query_params.get('term')
        year = self.request.query_params.get('academic_year')
        if class_id:
            qs = qs.filter(class_assigned_id=class_id)
        if term_id:
            qs = qs.filter(term_id=term_id)
        if year:
            qs = qs.filter(academic_year=year)
        return qs

    def _get_passing_score(self, class_obj):
        cycle_name = class_obj.cycle.name if class_obj.cycle else 'college'
        max_score = 10 if cycle_name == 'primaire' else 20
        return max_score / 2

    def list(self, request):
        class_id = request.query_params.get('class_assigned')
        term_id = request.query_params.get('term')

        if class_id and term_id:
            from classes.models import Class
            from grades.models import Term
            class_obj = Class.objects.get(id=class_id)
            term_obj = Term.objects.filter(id=term_id).first()
            passing_score = self._get_passing_score(class_obj)
            students = StudentAverage.objects.filter(
                term_id=term_id,
                student__class_assigned_id=class_id,
            )

            total_students = 0
            total_passed = 0
            total_avg = 0.0
            for avg in students:
                a = float(avg.average) if avg.average is not None else 0
                total_students += 1
                if a >= passing_score:
                    total_passed += 1
                total_avg += a

            total_failed = total_students - total_passed
            overall_avg = round(total_avg / total_students, 2) if total_students else 0

            return Response([{
                'class_assigned': class_obj.id,
                'class_name': class_obj.display_name,
                'term': term_id,
                'term_name': str(term_obj.name) if term_obj else '',
                'total_students': total_students,
                'passed': total_passed,
                'failed': total_failed,
                'average': overall_avg,
            }])

        return super().list(request)

    @action(detail=False, methods=['post'])
    def compute(self, request):
        class_id = request.data.get('class_id')
        term_id = request.data.get('term_id')
        academic_year = request.data.get('academic_year', '2024-2025')

        if not class_id or not term_id:
            return Response({'error': 'class_id et term_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        from classes.models import Class
        from grades.models import Term
        class_obj = Class.objects.get(id=class_id)
        term = Term.objects.get(id=term_id)
        students = Student.objects.filter(class_assigned=class_obj, status='active')

        cycle_name = class_obj.cycle.name if class_obj.cycle else 'college'
        max_score = 10 if cycle_name == 'primaire' else 20
        passing_score = max_score / 2

        totals = []
        for s in students:
            try:
                avg = StudentAverage.objects.get(student=s, term=term)
                totals.append((s, avg.average))
            except StudentAverage.DoesNotExist:
                pass

        if not totals:
            return Response({'error': 'Aucune moyenne trouvée'}, status=status.HTTP_400_BAD_REQUEST)

        passed = sum(1 for _, a in totals if a >= passing_score)
        failed = len(totals) - passed
        overall_avg = sum(a for _, a in totals) / len(totals)
        best = max(totals, key=lambda x: x[1])

        result, created = ClassResult.objects.update_or_create(
            class_assigned=class_obj,
            term=term,
            defaults={
                'academic_year': academic_year,
                'total_students': len(totals),
                'passed': passed,
                'failed': failed,
                'average': round(overall_avg, 2),
                'best_student': best[0],
            }
        )

        serializer = self.get_serializer(result)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def admis_list(self, request):
        class_id = request.query_params.get('class_id')
        term_id = request.query_params.get('term_id')

        if not class_id or not term_id:
            return Response({'error': 'class_id et term_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        from classes.models import Class
        class_obj = Class.objects.get(id=class_id)
        cycle_name = class_obj.cycle.name if class_obj.cycle else 'college'
        max_score = 10 if cycle_name == 'primaire' else 20
        passing_score = max_score / 2

        averages = StudentAverage.objects.filter(
            term_id=term_id,
            student__class_assigned_id=class_id,
            average__gte=passing_score,
        ).select_related('student').order_by('-average')

        data = []
        for avg in averages:
            s = avg.student
            data.append({
                'student_id': s.id,
                'matricule': s.matricule,
                'first_name': s.first_name,
                'last_name': s.last_name,
                'average': float(avg.average),
                'rank': avg.rank,
            })

        return Response({
            'count': len(data),
            'results': data,
        })
