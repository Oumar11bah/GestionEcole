import io
import os
from datetime import datetime

import requests
from io import BytesIO

import qrcode
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, Color
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage,
    Frame, PageTemplate, BaseDocTemplate, NextPageTemplate, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.conf import settings
from accounts.permissions import CanManageStudents, CanExportData
from accounts.utils import TenantAwareMixin, get_request_tenant

from .models import Student, Parent
from .serializers import StudentSerializer, ParentSerializer
from classes.models import Class

SCHOOL_NAME = "Ecole Privée Excellence"
SCHOOL_ADDRESS = "Conakry, République de Guinée"
SCHOOL_PHONE = "+224 600 00 00 00"
PRIMARY_COLOR = HexColor('#1e3a5f')
SECONDARY_COLOR = HexColor('#3b82f6')
ACCENT_BLUE = HexColor('#2563eb')
LIGHT_BLUE = HexColor('#eff6ff')
WHITE = HexColor('#ffffff')
DARK_GRAY = HexColor('#1f2937')
MEDIUM_GRAY = HexColor('#6b7280')
LIGHT_GRAY = HexColor('#f3f4f6')
RED_AFRICA = HexColor('#EF4444')
YELLOW_AFRICA = HexColor('#EAB308')
GREEN_AFRICA = HexColor('#22C55E')

def generate_qr_code(data, size=100):
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    img = img.resize((size, size), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer

LOGO_PATH = os.path.join(settings.BASE_DIR, 'frontend', 'src', 'assets', 'LOG.png')

def draw_school_logo(c, x, y, w, h):
    if os.path.exists(LOGO_PATH):
        try:
            img = RLImage(LOGO_PATH, w, h)
            img.drawOn(c, x, y)
            return True
        except:
            pass
    return False

def draw_guinea_stripe(c, card_w, card_h, MARGIN):
    h = 0.5*mm
    gap = 0.25*mm
    x = MARGIN
    w = card_w - 2*MARGIN
    y = card_h - 6.5*mm
    for color in (RED_AFRICA, YELLOW_AFRICA, GREEN_AFRICA):
        c.setFillColor(color)
        c.rect(x, y, w, h, fill=1, stroke=0)
        y -= gap + h

def draw_student_card(c, student, card_w, card_h, x_offset=0, y_offset=0):
    c.saveState()
    c.translate(x_offset, y_offset)

    R = 6*mm
    MARGIN = 4*mm

    padding = 1.5*mm
    c.setFillColor(HexColor('#00000020'))
    c.roundRect(-padding, -padding, card_w + 2*padding, card_h + 2*padding, R, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.roundRect(0, 0, card_w, card_h, R, fill=1, stroke=0)

    HEADER_H = 9*mm
    header_y = card_h - HEADER_H

    c.setFillColor(PRIMARY_COLOR)
    c.roundRect(0, header_y, card_w, HEADER_H, R, fill=1, stroke=0)

    draw_guinea_stripe(c, card_w, card_h, MARGIN)

    logo_w = 7*mm
    logo_h = 8*mm
    logo_x = MARGIN
    logo_y = header_y + (HEADER_H - logo_h) / 2
    if not draw_school_logo(c, logo_x, logo_y, logo_w, logo_h):
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 5)
        c.drawCentredString(logo_x + logo_w / 2, logo_y + logo_h / 2, "EPE")

    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 6)
    c.drawCentredString(card_w / 2, header_y + HEADER_H / 2 + 0.5*mm, SCHOOL_NAME)

    c.setFont('Helvetica', 4.5)
    c.drawRightString(card_w - MARGIN, header_y + HEADER_H / 2 + 0.5*mm, student.academic_year)

    photo_w = 22*mm
    photo_h = 28*mm
    photo_x = MARGIN
    photo_y = 11*mm

    c.setStrokeColor(HexColor('#d1d5db'))
    c.setLineWidth(0.5)
    c.roundRect(photo_x, photo_y, photo_w, photo_h, 2.5*mm, fill=0, stroke=1)

    if student.photo:
        try:
            photo_url = student.photo.url
            if photo_url.startswith(('http://', 'https://')):
                resp = requests.get(photo_url, timeout=10)
                img_data = BytesIO(resp.content)
                img = RLImage(img_data, photo_w - 1.5*mm, photo_h - 1.5*mm)
                img.drawOn(c, photo_x + 0.75*mm, photo_y + 0.75*mm)
            else:
                photo_path = student.photo.path
                if os.path.exists(photo_path):
                    img = RLImage(photo_path, photo_w - 1.5*mm, photo_h - 1.5*mm)
                    img.drawOn(c, photo_x + 0.75*mm, photo_y + 0.75*mm)
                else:
                    raise FileNotFoundError
        except Exception:
            c.setFillColor(LIGHT_GRAY)
            c.roundRect(photo_x + 0.75*mm, photo_y + 0.75*mm, photo_w - 1.5*mm, photo_h - 1.5*mm, 2*mm, fill=1, stroke=0)
            c.setFillColor(MEDIUM_GRAY)
            c.setFont('Helvetica', 12)
            c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h/2 - 2*mm, "?")
    else:
        c.setFillColor(LIGHT_GRAY)
        c.roundRect(photo_x + 0.75*mm, photo_y + 0.75*mm, photo_w - 1.5*mm, photo_h - 1.5*mm, 2*mm, fill=1, stroke=0)
        c.setFillColor(MEDIUM_GRAY)
        c.setFont('Helvetica', 12)
        c.drawCentredString(photo_x + photo_w/2, photo_y + photo_h/2 - 2*mm, "?")

    info_x = photo_x + photo_w + 5*mm
    fields = [
        ("Nom", student.last_name.upper()),
        ("Prenom", student.first_name),
        ("Matricule", student.matricule),
    ]
    if student.class_assigned:
        fields.append(("Classe", student.class_assigned.name))
        if student.class_assigned.cycle:
            fields.append(("Cycle", student.class_assigned.cycle.name))

    line_h = 5.5*mm
    info_y = photo_y + photo_h - line_h + 1*mm

    for label, value in reversed(fields):
        c.setFillColor(PRIMARY_COLOR)
        c.setFont('Helvetica-Bold', 4.5)
        c.drawString(info_x, info_y, label.upper())
        c.setFillColor(DARK_GRAY)
        c.setFont('Helvetica', 6.5)
        c.drawString(info_x + 16*mm, info_y, value)
        info_y -= line_h

    qr_s = 17*mm
    qr_x = card_w - 3*mm - qr_s
    qr_y = photo_y + (photo_h - qr_s) / 2

    qr_data = f"{SCHOOL_NAME}|{student.matricule}|{student.first_name} {student.last_name}"
    qr_buffer = generate_qr_code(qr_data, size=200)
    qr_img = RLImage(qr_buffer, qr_s, qr_s)
    qr_img.drawOn(c, qr_x, qr_y)

    c.setFillColor(MEDIUM_GRAY)
    c.setFont('Helvetica', 3.5)
    c.drawCentredString(qr_x + qr_s/2, qr_y - 2*mm, "Scanner")

    sep_y = 7.5*mm
    c.setStrokeColor(HexColor('#e5e7eb'))
    c.setLineWidth(0.4)
    c.line(MARGIN, sep_y, card_w - MARGIN, sep_y)

    parent_name = student.parent.full_name if student.parent else "Non defini"
    parent_phone = student.parent.phone_number if student.parent else ""

    c.setFillColor(PRIMARY_COLOR)
    c.setFont('Helvetica-Bold', 4.5)
    c.drawString(MARGIN, 4*mm, "PARENT / TUTEUR")
    c.setFillColor(MEDIUM_GRAY)
    c.setFont('Helvetica', 5)
    c.drawString(MARGIN, 1*mm, parent_name + (f"  |  Tel: {parent_phone}" if parent_phone else ""))

    c.setFillColor(PRIMARY_COLOR)
    c.setFont('Helvetica-Bold', 4.5)
    c.drawRightString(card_w - MARGIN, 4*mm, "CACHET / SIGNATURE")
    c.setFillColor(MEDIUM_GRAY)
    c.setFont('Helvetica', 5)
    c.drawRightString(card_w - MARGIN, 1*mm, "Direction de l'ecole")

    c.restoreState()

def draw_card_back(c, student, card_w, card_h, x_offset=0, y_offset=0):
    c.saveState()
    c.translate(x_offset, y_offset)

    R = 6*mm
    MARGIN = 4*mm

    padding = 1.5*mm
    c.setFillColor(HexColor('#00000020'))
    c.roundRect(-padding, -padding, card_w + 2*padding, card_h + 2*padding, R, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.roundRect(0, 0, card_w, card_h, R, fill=1, stroke=0)

    SIDE_W = 28*mm

    c.setFillColor(PRIMARY_COLOR)
    c.roundRect(0, 0, card_w - SIDE_W, card_h, R, fill=1, stroke=0)
    c.rect(card_w - SIDE_W - R, 0, R, card_h, fill=1, stroke=0)

    cx = (card_w - SIDE_W) / 2
    cy = card_h / 2

    logo_w = 14*mm
    logo_h = 16*mm
    logo_cy = cy + 6*mm
    if not draw_school_logo(c, cx - logo_w / 2, logo_cy - logo_h / 2, logo_w, logo_h):
        c.setFillColor(WHITE)
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(cx, logo_cy + 1*mm, "EPE")

    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 8)
    c.drawCentredString(cx, cy - 7*mm, SCHOOL_NAME)

    c.setFont('Helvetica', 5)
    c.drawCentredString(cx, cy - 10*mm, SCHOOL_ADDRESS)

    sx = card_w - SIDE_W + 2.5*mm
    msg_y = card_h - 10*mm

    c.setFillColor(DARK_GRAY)
    c.setFont('Helvetica', 4.8)
    lines = [
        "Cette carte est",
        "strictement personnelle.",
        "",
        "En cas de perte, veuillez",
        "contacter l'administration",
        "de l'ecole.",
    ]
    for line in lines:
        c.drawString(sx, msg_y, line)
        msg_y -= 3*mm

    msg_y -= 2*mm
    c.setStrokeColor(PRIMARY_COLOR)
    c.setLineWidth(0.3)
    c.line(sx, msg_y, card_w - MARGIN, msg_y)
    msg_y -= 3.5*mm

    c.setFillColor(PRIMARY_COLOR)
    c.setFont('Helvetica-Bold', 6)
    c.drawString(sx, msg_y, SCHOOL_PHONE)
    msg_y -= 5*mm

    c.setFont('Helvetica-Oblique', 4)
    c.setFillColor(MEDIUM_GRAY)
    c.drawString(sx, msg_y, "Cachet / Signature")

    c.restoreState()


class StudentViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('last_name', 'first_name')
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated, CanManageStudents]

    def get_queryset(self):
        queryset = super().get_queryset()
        if hasattr(self, 'request'):
            class_id = self.request.query_params.get('class_id', None)
            if class_id and class_id.isdigit():
                queryset = queryset.filter(class_assigned_id=class_id)
        return queryset

    def perform_create(self, serializer):
        super().perform_create(serializer)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['get'])
    def by_class(self, request):
        class_id = request.query_params.get('class_id')
        if class_id:
            tenant = get_request_tenant(request)
            students = Student.objects.filter(class_assigned_id=class_id)
            if tenant:
                students = students.filter(tenant=tenant)
            serializer = self.get_serializer(students, many=True)
            return Response(serializer.data)
        return Response({'error': 'class_id parameter required'}, status=400)

    @action(detail=True, methods=['get'])
    def card_pdf(self, request, pk=None):
        tenant = get_request_tenant(request)
        student = get_object_or_404(Student, pk=pk, tenant=tenant) if tenant else get_object_or_404(Student, pk=pk)
        duplicate = request.query_params.get('duplicate', 'false').lower() == 'true'

        CARD_W = 95*mm
        CARD_H = 58*mm
        page_w, page_h = A4

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)

        cx1 = (page_w - 2 * CARD_W) / 3
        cx2 = cx1 * 2 + CARD_W
        cy = page_h - CARD_H - 10*mm
        draw_student_card(c, student, CARD_W, CARD_H, cx1, cy)
        draw_card_back(c, student, CARD_W, CARD_H, cx2, cy)
        c.showPage()
        c.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        filename = f"carte_{student.matricule}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'])
    def card(self, request, pk=None):
        tenant = get_request_tenant(request)
        student = get_object_or_404(Student, pk=pk, tenant=tenant) if tenant else get_object_or_404(Student, pk=pk)
        duplicate = request.query_params.get('duplicate', 'false').lower() == 'true'
        from django.template.loader import render_to_string
        html = render_to_string('students/student_card.html', {
            'student': student,
            'duplicate': duplicate,
            'academic_year': student.academic_year or '2024-2025',
        })
        return HttpResponse(html)

    @action(detail=False, methods=['get'])
    def cards_pdf(self, request):
        students = self.get_queryset()
        class_id = request.query_params.get('class_id', None)
        cycle = request.query_params.get('cycle', None)
        status = request.query_params.get('status', None)
        if class_id and class_id.isdigit():
            students = students.filter(class_assigned_id=class_id)
        if status:
            students = students.filter(status=status)
        if cycle:
            students = students.filter(class_assigned__cycle__name=cycle)
        students = students.order_by('last_name', 'first_name')

        CARD_W = 95*mm
        CARD_H = 58*mm
        GAP_X = 8*mm
        GAP_Y = 8*mm
        page_w, page_h = A4
        margin_x = (page_w - 2 * CARD_W - GAP_X) / 2

        front_positions = []
        back_positions = []
        for row in range(4):
            y = page_h - 5*mm - CARD_H - row * (CARD_H + GAP_Y)
            front_positions.append((margin_x, y))
            back_positions.append((margin_x + CARD_W + GAP_X, y))

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        for i, student in enumerate(students):
            if i > 0 and i % 4 == 0:
                c.showPage()
            row = i % 4
            draw_student_card(c, student, CARD_W, CARD_H, front_positions[row][0], front_positions[row][1])
            draw_card_back(c, student, CARD_W, CARD_H, back_positions[row][0], back_positions[row][1])
        if students:
            c.showPage()
        c.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="cartes_eleves.pdf"'
        return response

    @action(detail=False, methods=['get'])
    def list_pdf(self, request):
        students = self.get_queryset()
        class_id = request.query_params.get('class_id', None)
        cycle = request.query_params.get('cycle', None)
        status = request.query_params.get('status', None)

        tenant = get_request_tenant(request)
        from school.models import SchoolInfo
        school = SchoolInfo.objects.filter(tenant=tenant).first() if tenant else SchoolInfo.objects.first()

        class_name = None
        if class_id and class_id.isdigit():
            students = students.filter(class_assigned_id=class_id)
            try:
                from classes.models import Class
                class_name = Class.objects.get(id=class_id).name
            except Class.DoesNotExist:
                pass
        if status:
            students = students.filter(status=status)
        if cycle:
            students = students.filter(class_assigned__cycle__name=cycle)

        students = students.order_by('last_name', 'first_name')

        buffer = io.BytesIO()
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib import colors

        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                leftMargin=15*mm, rightMargin=15*mm,
                                topMargin=15*mm, bottomMargin=15*mm)
        styles = getSampleStyleSheet()
        story = []

        s_name = school.name if school else SCHOOL_NAME
        s_address = f"{school.address or ''}{', ' + school.city if school and school.city else ''}{', ' + school.country if school and school.country else ''}".strip(', ') if school else SCHOOL_ADDRESS
        s_primary = HexColor(school.primary_color) if school and school.primary_color else PRIMARY_COLOR

        if school and school.logo:
            try:
                logo = RLImage(school.logo.path, width=40*mm, height=15*mm)
                logo_table = Table([[logo]], colWidths=[doc.width])
                logo_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER')]))
                story.append(logo_table)
            except Exception:
                pass

        title_style = ParagraphStyle('Title2', parent=styles['Title'],
                                      textColor=s_primary, fontSize=16,
                                      spaceAfter=4*mm, alignment=TA_CENTER)
        info_style = ParagraphStyle('Info2', parent=styles['Normal'],
                                     fontSize=9, alignment=TA_CENTER, textColor=MEDIUM_GRAY)

        story.append(Paragraph(s_name, ParagraphStyle('SchoolName', parent=styles['Title'],
                              fontSize=14, textColor=s_primary, alignment=TA_CENTER, spaceAfter=2*mm)))
        if s_address:
            story.append(Paragraph(s_address, info_style))
        story.append(Spacer(1, 4*mm))

        title = f"Liste des Élèves de la {class_name}" if class_name else "Liste des Élèves"
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 2*mm))

        data = [['N°', 'Matricule', 'Nom', 'Prénom', 'Classe', 'Statut']]
        for i, s in enumerate(students, 1):
            class_name = s.class_assigned.name if s.class_assigned else '-'
            status_label = {'active': 'Actif', 'suspended': 'Suspendu', 'expelled': 'Radie'}.get(s.status, s.status)
            data.append([str(i), s.matricule, s.last_name.upper(), s.first_name, class_name, status_label])

        col_widths = [10*mm, 28*mm, 38*mm, 38*mm, 35*mm, 25*mm]
        table = Table(data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('ALIGN', (4, 0), (5, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#f0f4ff')]),
        ]))
        story.append(table)

        if school and school.director_name:
            sig_style = ParagraphStyle('Sig', fontSize=9, alignment=TA_CENTER, textColor=DARK_GRAY)
            story.append(Spacer(1, 12*mm))
            story.append(Paragraph(f"Le Directeur(trice): <b>{school.director_name}</b>", sig_style))
            if school.director_signature:
                try:
                    sig_img = RLImage(school.director_signature.path, width=30*mm, height=15*mm)
                    sig_table = Table([[sig_img]], colWidths=[doc.width])
                    sig_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER')]))
                    story.append(sig_table)
                except Exception:
                    pass

        doc.build(story)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="liste_eleves.pdf"'
        return response

class ParentViewSet(TenantAwareMixin, viewsets.ModelViewSet):
    queryset = Parent.objects.all().order_by('full_name')
    serializer_class = ParentSerializer
    permission_classes = [IsAuthenticated, CanManageStudents]
