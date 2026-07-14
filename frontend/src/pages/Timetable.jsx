import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import MessageModal from '../components/MessageModal';
import { Plus, Trash2, Pencil, Calendar, MapPin, User, Clock, BookOpen, School, X, Save, Printer, Download, AlertTriangle, RefreshCw, Phone, Mail, Globe, GraduationCap, CalendarClock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { timetableService, classService, subjectService, teacherService, roomService, cycleService, teacherSubjectService, schoolService } from '../services/api';
import { getPreferredAcademicYear, fetchAcademicYears } from '../utils/preferences';
import jsPDF from 'jspdf';
import { autoTable as autoTableFn } from 'jspdf-autotable';

const DAY_LABELS = { monday: 'timetable.day.monday', tuesday: 'timetable.day.tuesday', wednesday: 'timetable.day.wednesday', thursday: 'timetable.day.thursday', friday: 'timetable.day.friday', saturday: 'timetable.day.saturday' };
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const SUBJECT_COLORS = [
  { bg: 'bg-emerald-50', text: 'text-emerald-900', sub: 'text-emerald-700', border: '#059669' },
  { bg: 'bg-blue-50', text: 'text-blue-900', sub: 'text-blue-700', border: '#2563eb' },
  { bg: 'bg-violet-50', text: 'text-violet-900', sub: 'text-violet-700', border: '#7c3aed' },
  { bg: 'bg-amber-50', text: 'text-amber-900', sub: 'text-amber-700', border: '#d97706' },
  { bg: 'bg-rose-50', text: 'text-rose-900', sub: 'text-rose-700', border: '#e11d48' },
  { bg: 'bg-cyan-50', text: 'text-cyan-900', sub: 'text-cyan-700', border: '#0891b2' },
  { bg: 'bg-orange-50', text: 'text-orange-900', sub: 'text-orange-700', border: '#ea580c' },
  { bg: 'bg-teal-50', text: 'text-teal-900', sub: 'text-teal-700', border: '#0d9488' },
  { bg: 'bg-pink-50', text: 'text-pink-900', sub: 'text-pink-700', border: '#db2777' },
  { bg: 'bg-indigo-50', text: 'text-indigo-900', sub: 'text-indigo-700', border: '#4f46e5' },
];

const getSubjectColor = (subject) => {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
};

const formatTime = (t) => t ? t.slice(0, 5).replace(':', 'H') : '';

const Timetable = () => {
  const { t } = useTranslation();
  const { user, canAccess } = useAuth();
  const [searchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterCycle, setFilterCycle] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const canWriteTimetable = canAccess?.('users');

  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [formData, setFormData] = useState({
    class_assigned_id: '', day: 'monday', start_time: '08:00', end_time: '10:00',
    subject_name: '', teacher_name: '', room: '', observation: '',
  });
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const [conflictStatus, setConflictStatus] = useState({ checking: false, available: null, errors: [] });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [showSlots, setShowSlots] = useState(false);
  const [toast, setToast] = useState(null);

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('timetable.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    Promise.all([
      timetableService.getAll(), classService.getAll(), subjectService.getAll(),
      teacherService.getAll(), roomService.getAll(), cycleService.getAll(),
      teacherSubjectService.getAll(), schoolService.get().catch(() => ({ data: null })),
      fetchAcademicYears(),
    ]).then(([e, c, s, t, r, cy, ts, sch, yr]) => {
      setEntries(e.data.results || e.data);
      setClasses(c.data.results || c.data);
      setSubjects(s.data.results || s.data);
      setTeachers(t.data.results || t.data);
      setRooms(r.data.results || r.data);
      setCycles(cy.data.results || cy.data);
      setTeacherSubjects(ts.data.results || ts.data);
      setSchoolInfo(sch.data);
      setYears(yr);
    }).catch(() => {}).finally(() => setLoading(false));
    if (searchParams.get('action') === 'add') setShowForm(true);
  }, []);

  useEffect(() => {
    const classIdFromUrl = searchParams.get('class_id');
    if (classIdFromUrl && classes.length > 0 && !filterClass) {
      setFilterClass(classIdFromUrl);
    }
  }, [searchParams, classes]);

  const filteredClasses = useMemo(() => {
    let list = classes;
    if (filterCycle) list = list.filter(c => c.cycle?.id === parseInt(filterCycle) || c.cycle === parseInt(filterCycle));
    if (filterYear) list = list.filter(c => c.academic_year === filterYear);
    return list;
  }, [classes, filterCycle, filterYear]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterClass && e.class_assigned_id !== parseInt(filterClass)) return false;
      if (filterTeacher && !e.teacher_name?.toLowerCase().includes(filterTeacher.toLowerCase())) return false;
      if (filterRoom && e.room !== filterRoom) return false;
      if (filterDay && e.day !== filterDay) return false;
      if (filterCycle) {
        const cls = classes.find(c => c.id === e.class_assigned_id);
        if (!cls || (cls.cycle?.id !== parseInt(filterCycle) && cls.cycle !== parseInt(filterCycle))) return false;
      }
      if (filterYear) {
        const cls = classes.find(c => c.id === e.class_assigned_id);
        if (!cls || cls.academic_year !== filterYear) return false;
      }
      return true;
    });
  }, [entries, filterClass, filterTeacher, filterRoom, filterDay, filterCycle, filterYear, classes]);

  const timeSlots = useMemo(() => {
    const seen = new Set();
    const slots = [];
    filteredEntries.forEach(e => {
      const key = `${e.start_time}-${e.end_time}`;
      if (!seen.has(key)) {
        seen.add(key);
        slots.push({ start: e.start_time, end: e.end_time });
      }
    });
    return slots.sort((a, b) => a.start.localeCompare(b.start));
  }, [filteredEntries]);

  const activeDays = useMemo(() => {
    return DAY_ORDER.filter(d => filteredEntries.some(e => e.day === d));
  }, [filteredEntries]);

  const getEntry = (day, start, end) => {
    return filteredEntries.find(e => e.day === day && e.start_time === start && e.end_time === end);
  };

  const getConflicts = (day, start, end) => {
    const dayEntries = entries.filter(e => e.day === day);
    const slotEntries = dayEntries.filter(e => e.start_time === start && e.end_time === end);
    const msgs = [];
    const teachers = slotEntries.map(e => e.teacher_name).filter(Boolean);
    const rooms = slotEntries.map(e => e.room).filter(Boolean);
    const classes = slotEntries.map(e => e.class_assigned_id);
    if (new Set(teachers).size < teachers.length) msgs.push(t('timetable.conflict_teacher'));
    if (new Set(rooms).size < rooms.length) msgs.push(t('timetable.conflict_room'));
    return msgs;
  };

  const selectedClass = classes.find(c => c.id === parseInt(filterClass));

  const formSubjects = useMemo(() => {
    if (!formData.class_assigned_id) return subjects;
    const cls = classes.find(c => c.id === parseInt(formData.class_assigned_id));
    const ts = teacherSubjects.filter(t => t.class_assigned_id === parseInt(formData.class_assigned_id));
    let filtered = subjects.filter(s => ts.some(t => t.subject_name === s.name));
    if (cls && cls.cycle?.id) {
      filtered = filtered.filter(s => {
        if (Array.isArray(s.cycle)) return s.cycle.includes(cls.cycle.id);
        return true;
      });
    }
    return filtered;
  }, [formData.class_assigned_id, subjects, teacherSubjects, classes]);

  const formTeachers = useMemo(() => {
    if (!formData.class_assigned_id) return teachers;
    const ts = teacherSubjects.filter(t => t.class_assigned_id === parseInt(formData.class_assigned_id));
    if (formData.subject_name) {
      return teachers.filter(t => ts.some(f => f.subject_name === formData.subject_name && f.teacher_id === t.id));
    }
    return teachers.filter(t => ts.some(f => f.teacher_id === t.id));
  }, [formData.class_assigned_id, formData.subject_name, teachers, teacherSubjects]);

  const refreshEntries = async () => {
    const e = await timetableService.getAll();
    setEntries(e.data.results || e.data);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.class_assigned_id || !formData.subject_name) { showModal('warning', t('timetable.required_title'), t('timetable.required_message')); return; }
    if (conflictStatus.available === false) {
      showModal('warning', t('timetable.conflict_detected'), t('timetable.conflict_save_message'));
      return;
    }
    setSaving(true);
    try {
      const data = {
        class_assigned_id: parseInt(formData.class_assigned_id), day: formData.day,
        start_time: formData.start_time, end_time: formData.end_time,
        subject_name: formData.subject_name, teacher_name: formData.teacher_name,
        room: formData.room, observation: formData.observation || '',
      };
      if (editEntry) await timetableService.update(editEntry.id, data);
      else await timetableService.create(data);
      await refreshEntries();
      const cls = classes.find(c => c.id === parseInt(formData.class_assigned_id));
      if (cls?.academic_year) setFilterYear(cls.academic_year);
      setShowForm(false); setEditEntry(null);
      showToast('success', editEntry ? t('timetable.edit_success') : t('timetable.add_success'));
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.conflicts) {
        showModal('error', t('timetable.conflict_detected'),
          resp.conflicts.map(c => `• ${c.message}\n  ${c.detail}`).join('\n\n')
        );
      } else if (typeof resp === 'object') {
        showModal('error', t('timetable.error'), Object.values(resp).flat().join('\n'));
      } else {
        showModal('error', t('timetable.error'), t('timetable.save_error'));
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    showModal('warning', t('timetable.confirmation'), t('timetable.delete_confirm'), async () => {
      try { await timetableService.delete(id); await refreshEntries(); closeModal(); }
      catch { showModal('error', t('timetable.error'), t('timetable.delete_error')); }
    });
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setFormData({
      class_assigned_id: String(entry.class_assigned_id || ''),
      day: entry.day, start_time: entry.start_time, end_time: entry.end_time,
      subject_name: entry.subject_name, teacher_name: entry.teacher_name || '', room: entry.room || '',
      observation: entry.observation || '',
    });
    setShowForm(true);
  };

  useEffect(() => {
    if (!showForm) { setConflictStatus({ checking: false, available: null, errors: [] }); setAvailableSlots([]); setShowSlots(false); return; }
    const { day, start_time, end_time, room, teacher_name, class_assigned_id } = formData;
    if (!day || !start_time || !end_time || !class_assigned_id) { setConflictStatus({ checking: false, available: null, errors: [] }); return; }
    const timer = setTimeout(async () => {
      setConflictStatus(s => ({ ...s, checking: true }));
      try {
        const res = await timetableService.checkConflicts({
          day, start_time, end_time, room: room || '', teacher_name: teacher_name || '',
          class_assigned_id: parseInt(class_assigned_id), exclude_id: editEntry?.id || undefined,
        });
        setConflictStatus({ checking: false, available: res.data.available, errors: res.data.errors || [] });
      } catch { setConflictStatus({ checking: false, available: null, errors: [] }); }
    }, 500);
    return () => clearTimeout(timer);
  }, [showForm, formData.day, formData.start_time, formData.end_time, formData.room, formData.teacher_name, formData.class_assigned_id, editEntry?.id]);

  const checkAvailability = async () => {
    const { day, start_time, end_time, room, teacher_name, class_assigned_id } = formData;
    if (!day || !class_assigned_id) { showModal('warning', t('timetable.required_fields'), t('timetable.select_day_class')); return; }
    try {
      const dur = start_time && end_time ? Math.round((new Date(`2000-01-01T${end_time}`) - new Date(`2000-01-01T${start_time}`)) / 60000) : 60;
      const res = await timetableService.availableSlots({
        day, room: room || '', teacher_name: teacher_name || '',
        class_assigned_id: parseInt(class_assigned_id), duration_minutes: Math.max(dur, 30),
        exclude_id: editEntry?.id || undefined,
      });
      setAvailableSlots(res.data.slots || []);
      setShowSlots(true);
    } catch (err) {
      console.error('Availability check failed:', err);
      showModal('error', t('timetable.error'), t('timetable.availability_error'));
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const resetFilters = () => {
    setFilterCycle(''); setFilterClass(''); setFilterTeacher('');
    setFilterRoom(''); setFilterDay(''); setFilterYear('');
  };

  const printTimetable = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const scol = schoolInfo || {};
    const clsName = selectedClass?.display_name || '';
    const year = filterYear || scol.academic_year || '';

    const thead = activeDays.map(d => `<th style="background:#059669;color:#fff;padding:8px 6px;font-size:11px;font-weight:700;text-align:center;border:1px solid #047857;text-transform:uppercase;letter-spacing:1px">${t(DAY_LABELS[d])}</th>`).join('');

    const tbody = timeSlots.map(slot => {
      const label = `${formatTime(slot.start)} - ${formatTime(slot.end)}`;
      const cells = activeDays.map(day => {
        const entry = getEntry(day, slot.start, slot.end);
        if (!entry) return '<td style="border:1px solid #000;padding:4px 6px;height:32px;background:#fff;text-align:center;font-size:11px"></td>';
        const c = getSubjectColor(entry.subject_name);
        const conflicts = getConflicts(day, slot.start, slot.end);
        return `<td style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:11px;background:${c.bg.replace('bg-', '#').replace('-50', '')}0d;${conflicts.length > 0 ? 'border:2px solid #ef4444;' : ''}">
          <div style="font-weight:700;font-size:12px;color:#1e293b">${entry.subject_name}</div>
          <div style="font-size:10px;color:#475569;margin-top:1px">${entry.room || ''}</div>
          <div style="font-size:10px;color:#475569">${entry.teacher_name || ''}</div>
          ${conflicts.length > 0 ? '<div style="color:#ef4444;font-size:9px;font-weight:600;margin-top:2px">⚠ ' + conflicts.join(' · ') + '</div>' : ''}
        </td>`;
      }).join('');
      return `<tr><td style="border:1px solid #000;padding:4px 6px;font-weight:600;font-size:11px;color:#475569;background:#f8fafc;text-align:center;width:90px">${label}</td>${cells}</tr>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${t('timetable.timetable_title')}</title>
<style>
  @page { size: landscape A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #1e293b; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 12px; }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-left h1 { font-size: 14px; margin: 0; color: #059669; }
  .header-left p { font-size: 11px; margin: 1px 0; color: #64748b; }
  .header-center { text-align: center; }
  .header-center h2 { font-size: 18px; margin: 0; letter-spacing: 4px; }
  .header-center .sub { font-size: 12px; color: #059669; font-weight: 600; margin: 2px 0; }
  .header-right { text-align: right; font-size: 10px; color: #64748b; }
  .header-right div { margin: 1px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #059669; color: #fff; padding: 8px 6px; font-size: 11px; font-weight: 700; text-align: center; border: 1px solid #047857; text-transform: uppercase; letter-spacing: 1px; }
  td { border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 11px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 28px; }
  .sig-box { text-align: center; width: 40%; }
  .sig-box .title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
  .sig-box .line { border-top: 1px solid #000; margin: 36px 0 2px; }
  .sig-box .name { font-size: 11px; color: #64748b; }
  .footer { text-align: center; margin-top: 10px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style></head><body>
<div class="header">
  <div class="header-left">
    ${scol.logo_url ? '<img src="' + scol.logo_url + '" style="height:44px" />' : ''}
    <div><h1>${scol.name || t('timetable.establishment')}</h1><p>${scol.acronym || ''}${scol.city ? ' · ' + scol.city : ''}</p></div>
  </div>
  <div class="header-center"><h2>${t('timetable.timetable_title')}</h2><div class="sub">${clsName}${clsName && year ? ' · ' : ''}${year}</div></div>
  <div class="header-right">${scol.phone ? '<div>📞 ' + scol.phone + '</div>' : ''}${scol.email ? '<div>✉ ' + scol.email + '</div>' : ''}${scol.website ? '<div>🌐 ' + scol.website + '</div>' : ''}</div>
</div>
<table><thead><tr><th style="width:90px">${t('timetable.schedule')}</th>${thead}</tr></thead><tbody>${tbody}</tbody></table>
<div class="signatures">
  <div class="sig-box"><div class="title">${t('timetable.principal')}</div><div class="line"></div><div class="name">${scol.director_name || ''}</div></div>
  <div class="sig-box"><div class="title">${t('timetable.head_teacher')}</div><div class="line"></div><div class="name"></div></div>
</div>
<div class="footer">${t('timetable.generated_on')} ${new Date().toLocaleDateString('fr-FR')} ${t('timetable.at')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
</body></html>`);
    win.document.close();
    win.print();
  };

  const downloadPdf = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const scol = schoolInfo || {};
    const clsName = selectedClass?.display_name || '';
    const year = filterYear || scol.academic_year || '';

    let y = 12;
    doc.setFontSize(16).setTextColor(5, 150, 105);
    doc.text(scol.name || t('timetable.establishment'), pw / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(22).setTextColor(30, 41, 59);
    doc.text(t('timetable.timetable_title'), pw / 2, y, { align: 'center' });
    y += 7;
    if (clsName) { doc.setFontSize(12).setTextColor(5, 150, 105); doc.text(clsName, pw / 2, y, { align: 'center' }); y += 5; }
    if (year) { doc.setFontSize(10).setTextColor(100, 116, 139); doc.text(year, pw / 2, y, { align: 'center' }); y += 3; }

    let cy = 10;
    doc.setFontSize(7).setTextColor(100, 116, 139);
    if (scol.phone) { doc.text(`T\xe9l: ${scol.phone}`, pw - 10, cy, { align: 'right' }); cy += 3.5; }
    if (scol.email) { doc.text(`Email: ${scol.email}`, pw - 10, cy, { align: 'right' }); cy += 3.5; }
    if (scol.website) { doc.text(`Web: ${scol.website}`, pw - 10, cy, { align: 'right' }); }

    const headerBottom = Math.max(y + 4, 28);
    doc.setDrawColor(5, 150, 105).setLineWidth(0.6).line(10, headerBottom, pw - 10, headerBottom);

    const cols = ['Horaire', ...activeDays.map(d => DAY_LABELS[d])];
    const rows = timeSlots.map(slot => {
      const label = `${formatTime(slot.start)} - ${formatTime(slot.end)}`;
      const cells = activeDays.map(day => {
        const entry = getEntry(day, slot.start, slot.end);
        if (!entry) return '';
        return [entry.subject_name, entry.teacher_name || '', entry.room || ''].filter(Boolean).join('\n');
      });
      return [label, ...cells];
    });

    autoTableFn(doc, {
      head: [cols], body: rows,
      startY: headerBottom + 5,
      margin: { left: 8, right: 8 },
      styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.3, valign: 'middle', halign: 'center', overflow: 'linebreak', minCellHeight: 7 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold', fillColor: [243, 244, 246], halign: 'center', valign: 'middle' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0 && data.cell.raw && data.cell.raw !== '') {
          const parts = data.cell.raw.split('\n');
          data.cell._parts = parts;
          data.cell.text = [''];
          data.cell.styles.minCellHeight = Math.max(parts.length * 4 + 2, 9);
        }
      },
      didDrawCell: (data) => {
        const parts = data.cell._parts;
        if (!parts || !parts[0]) return;
        const h = data.cell.height;
        const cx = data.cell.x + data.cell.width / 2;
        const n = parts.filter(Boolean).length;
        const blockH = n === 3 ? 7 : n === 2 ? 3.8 : 0;
        let y = data.cell.y + (h - blockH) / 2;

        doc.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(30, 41, 59);
        doc.text(parts[0], cx, y, { align: 'center' });

        if (parts[1]) {
          y += 3.8;
          doc.setFont('helvetica', 'normal').setFontSize(6.5).setTextColor(71, 85, 105);
          doc.text(parts[1], cx, y, { align: 'center' });
        }
        if (parts[2]) {
          y += 3.2;
          doc.setFont('helvetica', 'normal').setFontSize(6).setTextColor(148, 163, 184);
          doc.text(parts[2], cx, y, { align: 'center' });
        }
      },
    });

    const fy = doc.lastAutoTable.finalY + 12;
    const sw = 50;
    doc.setFontSize(9).setTextColor(71, 85, 105);
    doc.text(t('timetable.principal'), 25, fy, { align: 'center' });
    doc.setDrawColor(0, 0, 0).line(25 - sw / 2, fy + 18, 25 + sw / 2, fy + 18);
    doc.setFontSize(7).setTextColor(148, 163, 184);
    doc.text(scol.director_name || '', 25, fy + 23, { align: 'center' });

    doc.setFontSize(9).setTextColor(71, 85, 105);
    doc.text(t('timetable.head_teacher'), pw - 25, fy, { align: 'center' });
    doc.setDrawColor(0, 0, 0).line(pw - 25 - sw / 2, fy + 18, pw - 25 + sw / 2, fy + 18);
    doc.setFontSize(7).setTextColor(148, 163, 184);
    doc.text('', pw - 25, fy + 23, { align: 'center' });

    doc.setFontSize(6).setTextColor(148, 163, 184);
    doc.text(`${t('timetable.generated_on')} ${new Date().toLocaleDateString('fr-FR')}`, pw / 2, ph - 8, { align: 'center' });

    doc.save(`${t('timetable.pdf_filename')}_${clsName.replace(/\s+/g, '_') || 'general'}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t('timetable.loading')}</span>
        </div>
      </div>
    );
  }

  const scol = schoolInfo || {};
  const totalConflicts = timeSlots.reduce((sum, slot) => {
    return sum + activeDays.reduce((s, day) => s + getConflicts(day, slot.start, slot.end).length, 0);
  }, 0);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('timetable.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('timetable.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 mb-5 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b-4 border-emerald-600">
          <div className="flex items-center space-x-3">
            {scol.logo_url ? (
              <img src={scol.logo_url} alt="" className="h-10 w-10 rounded object-cover border border-gray-200" />
            ) : (
              <div className="h-10 w-10 rounded bg-emerald-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-emerald-700">{scol.name || t('timetable.establishment')}</h2>
              <p className="text-xs text-gray-500">{scol.acronym || ''}{scol.city ? ' · ' + scol.city : ''}</p>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900 tracking-[3px]">
              {selectedClass ? `${t('timetable.timetable_for')} ${selectedClass.display_name}` : t('timetable.timetable_title')}
            </h1>
            <p className="text-xs text-gray-400">{filterYear || scol.academic_year || ''}</p>
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5">
            {scol.phone && <div><Phone className="w-3 h-3 inline mr-1" />{scol.phone}</div>}
            {scol.email && <div><Mail className="w-3 h-3 inline mr-1" />{scol.email}</div>}
            {scol.website && <div><Globe className="w-3 h-3 inline mr-1" />{scol.website}</div>}
          </div>
        </div>
        <div className="px-5 py-3 bg-gray-50 flex flex-wrap items-center gap-2">
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white">
            <option value="">{t('timetable.academic_year')}</option>
            {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
          </select>
          <select value={filterCycle} onChange={(e) => setFilterCycle(e.target.value)}
            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white">
            <option value="">{t('timetable.cycle')}</option>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white">
            <option value="">{t('timetable.class')}</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
          </select>
          <span className="text-gray-200">|</span>
          <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}
            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white">
            <option value="">{t('timetable.teacher')}</option>
            {teachers.map(t => <option key={t.id} value={`${t.first_name} ${t.last_name}`}>{t.first_name} {t.last_name}</option>)}
          </select>
          <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}
            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white">
            <option value="">{t('timetable.room')}</option>
            {rooms.map(r => <option key={r.id} value={r.name}>{r.name} ({r.code})</option>)}
          </select>
          <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)}
            className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 bg-white">
            <option value="">{t('timetable.day')}</option>
            {DAY_ORDER.map(d => <option key={d} value={d}>{t(DAY_LABELS[d])}</option>)}
          </select>
          <div className="flex-1" />
          <button onClick={resetFilters}
            className="flex items-center space-x-1 px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-100">
            <RefreshCw className="w-3 h-3" /><span>{t('timetable.reset')}</span>
          </button>
          <button onClick={printTimetable} disabled={filteredEntries.length === 0}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
            <Printer className="w-3.5 h-3.5" /><span>{t('timetable.print')}</span>
          </button>
          <button onClick={downloadPdf} disabled={filteredEntries.length === 0}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800 disabled:opacity-50">
            <Download className="w-3.5 h-3.5" /><span>{t('timetable.pdf')}</span>
          </button>
          {canWriteTimetable && (
          <button onClick={() => { setShowForm(true); setEditEntry(null); setFormData({ class_assigned_id: filterClass || '', day: 'monday', start_time: '08:00', end_time: '10:00', subject_name: '', teacher_name: '', room: '', observation: '' }); }}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
            <Plus className="w-3.5 h-3.5" /><span>{t('timetable.add_course')}</span>
          </button>
          )}
          <span className="text-xs text-gray-400">
            {filteredEntries.length} {t('timetable.courses')}{totalConflicts > 0 ? <span className="text-red-600 font-medium ml-1">| {totalConflicts} {t('timetable.conflicts')}</span> : ''}
          </span>
        </div>
      </div>

      {filterClass && (
        <div className="bg-white rounded-lg border border-gray-200 mb-4 px-3 py-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-500 mr-1">{t('timetable.classes')}:</span>
          {filteredClasses.map(c => (
            <button key={c.id} onClick={() => setFilterClass(String(c.id))}
              className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${filterClass === String(c.id) ? 'bg-emerald-600 text-white border-emerald-600 font-medium' : 'text-gray-600 border-gray-300 hover:border-emerald-400 hover:text-emerald-700'}`}>
              {c.display_name || c.name}
            </button>
          ))}
        </div>
      )}

      {!filterClass && !filterTeacher && !filterRoom ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">{t('timetable.select_class')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {filteredClasses.map(c => {
              const count = entries.filter(e => e.class_assigned_id === c.id).length;
              return (
                <button key={c.id} onClick={() => setFilterClass(String(c.id))}
                  className="border border-gray-300 rounded px-3 py-3 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors">
                  <div className="text-sm font-semibold text-gray-800">{c.display_name || c.name}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{count} {t('timetable.courses')}</div>
                </button>
              );
            })}
            {filteredClasses.length === 0 && <p className="text-sm text-gray-400 col-span-full text-center py-4">{t('timetable.no_classes')}</p>}
          </div>
          {canWriteTimetable && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-center">
            <button onClick={() => { setShowForm(true); setFormData({ class_assigned_id: '', day: 'monday', start_time: '08:00', end_time: '10:00', subject_name: '', teacher_name: '', room: '', observation: '' }); }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /><span>{t('timetable.add_course')}</span>
            </button>
          </div>
          )}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">{t('timetable.no_courses')}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {filterClass ? t('timetable.no_timetable') : t('timetable.adjust_filters')}
          </p>
          {canWriteTimetable && (
          <button onClick={() => { setShowForm(true); setFormData({ class_assigned_id: filterClass || '', day: 'monday', start_time: '08:00', end_time: '10:00', subject_name: '', teacher_name: '', room: '', observation: '' }); }}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /><span>{t('timetable.add_course')}</span>
          </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-emerald-600 text-white px-3 py-2.5 text-xs font-bold text-center border border-emerald-700 uppercase tracking-wider" style={{ width: 90, minWidth: 90 }}>
                    {t('timetable.schedule')}
                  </th>
                  {activeDays.map((day) => (
                    <th key={day} className="bg-emerald-600 text-white px-3 py-2.5 text-xs font-bold text-center border border-emerald-700 uppercase tracking-wider">
                      {t(DAY_LABELS[day])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, idx) => {
                  const label = `${formatTime(slot.start)} - ${formatTime(slot.end)}`;
                  const hasContent = activeDays.some(d => getEntry(d, slot.start, slot.end));
                  return (
                    <tr key={`${slot.start}-${slot.end}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                      <td className="sticky left-0 z-10 bg-gray-100/95 px-2.5 py-2 text-xs font-semibold text-gray-600 text-center border border-gray-300 align-middle" style={{ width: 90, minWidth: 90 }}>
                        {label}
                      </td>
                      {activeDays.map((day) => {
                        const entry = getEntry(day, slot.start, slot.end);
                        if (!entry) {
                          return <td key={day} className="border border-gray-300 p-1.5 text-center align-middle bg-white" />;
                        }
                        const c = getSubjectColor(entry.subject_name);
                        const conflicts = getConflicts(day, slot.start, slot.end);
                        return (
                          <td key={day} className={`border ${conflicts.length > 0 ? 'border-red-500 border-2' : 'border-gray-300'} p-1.5 text-center align-middle ${c.bg} relative group`}>
                            <div className="font-bold text-xs text-gray-900 leading-tight">{entry.subject_name}</div>
                            <div className="text-[10px] text-gray-600 leading-tight mt-0.5">{entry.room || ''}</div>
                            <div className="text-[10px] text-gray-500 leading-tight">{entry.teacher_name || ''}</div>
                            {conflicts.length > 0 && (
                              <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 flex items-center justify-center" title={conflicts.join(', ')}>
                                <AlertTriangle className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            {canWriteTimetable && (
                            <div className="absolute top-1 left-1 flex space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                className="p-0.5 bg-white border border-gray-300 rounded text-gray-500 hover:text-blue-600" title={t('timetable.edit')}>
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                className="p-0.5 bg-white border border-gray-300 rounded text-gray-500 hover:text-red-600" title={t('timetable.delete')}>
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-300 px-5 py-4 flex justify-between bg-gray-50">
            <div className="text-center">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-8">{t('timetable.principal')}</p>
              <div className="w-48 border-t border-gray-800 mx-auto"></div>
              <p className="text-xs text-gray-400 mt-1">{scol.director_name || ''}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-8">{t('timetable.head_teacher')}</p>
              <div className="w-48 border-t border-gray-800 mx-auto"></div>
              <p className="text-xs text-gray-400 mt-1"></p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <CalendarClock className="w-5 h-5 text-emerald-600" />
                <span>{editEntry ? t('timetable.edit_course') : t('timetable.new_course')}</span>
              </h2>
              <button onClick={() => { setShowForm(false); setEditEntry(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {conflictStatus.available !== null && (
              <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center space-x-2 ${
                conflictStatus.available
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {conflictStatus.checking ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : conflictStatus.available ? (
                  <><span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</span><span>{t('timetable.available')}</span></>
                ) : (
                  <><span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">!</span>
                    <div>
                      <span className="font-bold">{t('timetable.conflict_detected')}</span>
                      {conflictStatus.errors.map((err, i) => (
                        <div key={i} className="text-xs mt-1">
                          <span className="font-semibold">{err.message}</span>
                          <br /><span className="opacity-75">{err.detail}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.class')} <span className="text-red-500">*</span></label>
                  <select value={formData.class_assigned_id} onChange={(e) => setFormData({ ...formData, class_assigned_id: e.target.value, subject_name: '', teacher_name: '' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow" required>
                    <option value="">{t('timetable.select')}</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.day')} <span className="text-red-500">*</span></label>
                  <select value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow" required>
                    {DAY_ORDER.map(d => <option key={d} value={d}>{t(DAY_LABELS[d])}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.start')} <span className="text-red-500">*</span></label>
                  <input type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.end')} <span className="text-red-500">*</span></label>
                  <input type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.subject')} <span className="text-red-500">*</span></label>
                <select value={formData.subject_name} onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow" required>
                  <option value="">{t('timetable.select')}</option>
                  {formSubjects.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.teacher')}</label>
                  <select value={formData.teacher_name} onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow">
                    <option value="">{t('timetable.select')}</option>
                    {formTeachers.map(t => <option key={t.id} value={`${t.first_name} ${t.last_name}`}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.room')}</label>
                  <select value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow">
                    <option value="">{t('timetable.select')}</option>
                    {rooms.map(r => <option key={r.id} value={r.name}>{r.name} ({r.code})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('timetable.observation')}</label>
                <textarea value={formData.observation} onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 bg-white transition-shadow resize-none"
                  rows={2} placeholder={t('timetable.observation_placeholder')} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={checkAvailability}
                    className="flex items-center space-x-1.5 px-3 py-2 border border-amber-300 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                    <Calendar className="w-3.5 h-3.5" /><span>{t('timetable.check_availability')}</span>
                  </button>
                  {showSlots && (
                    <div className="relative">
                      <button type="button" onClick={() => setShowSlots(false)}
                        className="flex items-center space-x-1.5 px-3 py-2 border border-amber-300 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                        <X className="w-3.5 h-3.5" /><span>{t('timetable.close')}</span>
                      </button>
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[60] p-2 max-h-56 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-500 px-2 py-1 border-b border-gray-100 mb-1">
                          {availableSlots.length} {t('timetable.slots_available')}
                        </div>
                        {availableSlots.length === 0 ? (
                          <div className="text-xs text-gray-400 px-2 py-3 text-center">{t('timetable.no_slots')}</div>
                        ) : (
                          availableSlots.map(slot => {
                            const [s, e] = slot.split('-');
                            return (
                              <button key={slot} type="button" onClick={() => {
                                setFormData(f => ({ ...f, start_time: s, end_time: e }));
                                setShowSlots(false);
                              }}
                                className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors">
                                <Clock className="w-3 h-3 inline mr-1.5" />{s} - {e}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setShowForm(false); setEditEntry(null); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    {t('timetable.cancel')}
                  </button>
                  <button type="submit" disabled={saving || conflictStatus.checking}
                    className={`flex items-center space-x-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                      conflictStatus.available === false
                        ? 'bg-red-500 text-white hover:bg-red-600 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md'
                    }`}>
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{saving ? t('timetable.saving') : (editEntry ? t('timetable.edit') : t('timetable.add'))}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center space-x-2 animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Timetable;
