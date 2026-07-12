import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Save, Upload, Download, Printer, FileSpreadsheet, Search, X, AlertCircle, CheckCircle, Award, TrendingUp, Star, Ban, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gradeService, classService, teacherSubjectService, studentService, subjectService, schoolService } from '../services/api';
import MessageModal from '../components/MessageModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildSchoolHeaderHTML, buildSchoolHeaderStyles } from '../utils/printHelpers';

const getScoreColor = (score, maxScore) => {
  if (score == null) return 'text-gray-300';
  const ratio = score / maxScore;
  if (ratio >= 0.8) return 'text-green-600 font-bold';
  if (ratio >= 0.6) return 'text-blue-600 font-semibold';
  if (ratio >= 0.5) return 'text-yellow-600 font-medium';
  return 'text-red-600 font-medium';
};

const EMPTY = '\u2014';

const Grades = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const APPRECIATIONS = [
    { threshold: 0.9, key: 'grades.excellent', color: 'bg-green-100 text-green-800' },
    { threshold: 0.8, key: 'grades.very_good', color: 'bg-emerald-100 text-emerald-800' },
    { threshold: 0.7, key: 'grades.good', color: 'bg-blue-100 text-blue-800' },
    { threshold: 0.6, key: 'grades.fairly_good', color: 'bg-indigo-100 text-indigo-800' },
    { threshold: 0.5, key: 'grades.passing', color: 'bg-yellow-100 text-yellow-800' },
    { threshold: 0, key: 'grades.fail', color: 'bg-red-100 text-red-800' },
  ];

  const getMention = (avg, maxScore) => {
    if (avg == null || maxScore <= 0) return { label: '\u2014', color: '' };
    const ratio = avg / maxScore;
    const found = APPRECIATIONS.find((a) => ratio >= a.threshold);
    const entry = found || APPRECIATIONS[APPRECIATIONS.length - 1];
    return { ...entry, label: t(entry.key) };
  };

  const mentionSortKey = (sa) => {
    if (sa.avg == null || maxScore <= 0) return 999;
    const ratio = sa.avg / maxScore;
    const idx = APPRECIATIONS.findIndex((a) => ratio >= a.threshold);
    return idx < 0 ? 999 : idx;
  };

  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classObj, setClassObj] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherSubjectMap, setTeacherSubjectMap] = useState({});
  const [gradeMap, setGradeMap] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const tableRef = useRef(null);
  const [schoolInfo, setSchoolInfo] = useState(null);

  const teacherAssignments = user?.teacher_profile?.subject_assignments || [];
  const teacherClassIds = [...new Set(teacherAssignments.map((a) => a.class_assigned_id))];
  const availableClasses = user?.profile?.role === 'enseignant'
    ? classes.filter((c) => teacherClassIds.includes(c.id))
    : classes;
  const availableSubjects = user?.profile?.role === 'enseignant' && selectedClass
    ? subjects.filter((s) => teacherAssignments.some((a) => a.subject_id === s.id && a.class_assigned_id === parseInt(selectedClass)))
    : subjects;

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('grades.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };
  const cellRefs = useRef({});
  const loadedDataRef = useRef('');

  const cycleName = classObj?.cycle?.name?.toLowerCase() || '';
  const maxScore = (cycleName === 'primaire' || cycleName === 'prescolaire') ? 10 : 20;
  const maxScoreLabel = `/${maxScore}`;

  useEffect(() => {
    Promise.all([
      classService.getAll(),
      gradeService.getAllTerms(),
      schoolService.get().catch(() => ({ data: null })),
    ]).then(([c, t, s]) => {
      setClasses(c.data.results || c.data);
      setTerms(t.data.results || t.data);
      setSchoolInfo(s.data);
    });
    if (searchParams.get('action') === 'import') setShowImport(true);
  }, []);

  const loadData = async () => {
    if (!selectedClass || !selectedTerm) return;
    const key = `${selectedClass}-${selectedTerm}`;
    if (key === loadedDataRef.current) return;
    loadedDataRef.current = key;

    setLoading(true);
    setErrors({});
    try {
      const cls = classes.find((c) => c.id === parseInt(selectedClass));
      setClassObj(cls);

      const [studRes, subjRes, tsRes, gradeRes] = await Promise.all([
        studentService.getAll({ class_id: selectedClass }),
        subjectService.byClass(selectedClass),
        teacherSubjectService.getAll({ class_id: selectedClass }),
        gradeService.getAll({ class_id: selectedClass, term_id: selectedTerm }),
      ]);

      const studentList = studRes.data.results || studRes.data;
      const subjectData = subjRes.data?.results || subjRes.data || [];
      const tsList = tsRes.data.results || tsRes.data;
      const gradeList = gradeRes.data.results || gradeRes.data;

      setStudents(studentList);
      setSubjects(subjectData);

      const tsMap = {};
      tsList.forEach((ts) => {
        const subjId = ts.subject_id || ts.subject?.id;
        if (subjId) tsMap[subjId] = ts;
      });
      setTeacherSubjectMap(tsMap);

      const map = {};
      gradeList.forEach((g) => {
        const sid = g.student?.id || g.student_id;
        const tsid = g.teacher_subject || g.teacher_subject_id;
        if (sid && tsid) {
          map[`${sid}-${tsid}`] = { id: g.id, score: g.composition != null ? parseFloat(g.composition) : null, locked: g.locked || false };
        }
      });
      setGradeMap(map);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [selectedClass, selectedTerm]);

  const getScore = (studentId, tsId) => {
    const entry = gradeMap[`${studentId}-${tsId}`];
    return entry?.score;
  };

  const isGradeLocked = (studentId, tsId) => {
    const entry = gradeMap[`${studentId}-${tsId}`];
    return entry?.locked || false;
  };

  const isAdmin = user?.profile?.role === 'super_admin' || user?.profile?.role === 'admin';

  const getGradeId = (studentId, tsId) => {
    const entry = gradeMap[`${studentId}-${tsId}`];
    return entry?.id;
  };

  const handleToggleLock = async (studentId, tsId) => {
    const entry = gradeMap[`${studentId}-${tsId}`];
    if (!entry?.id) return;
    try {
      const resp = await gradeService.toggleLock(entry.id);
      setGradeMap((prev) => {
        const key = `${studentId}-${tsId}`;
        const next = { ...prev };
        if (next[key]) {
          next[key] = { ...next[key], locked: resp.data.locked };
        }
        return next;
      });
    } catch (e) {
      showModal('error', t('grades.error'), e.response?.data?.error || t('grades.toggleLockError'));
    }
  };

  const getMaxScore = (tsId) => maxScore;

  const handleCellChange = (studentId, tsId, rawValue) => {
    const key = `${studentId}-${tsId}`;
    const trimmed = rawValue.trim();

    if (trimmed === '' || trimmed === '-') {
      setGradeMap((prev) => {
        const next = { ...prev };
        if (next[key]) {
          next[key] = { ...next[key], score: null };
        }
        return next;
      });
      setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }

    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      setErrors((prev) => ({ ...prev, [key]: t('grades.invalidNumber') }));
      return;
    }

    const cellMax = getMaxScore(tsId);
    if (num < 0) {
      setErrors((prev) => ({ ...prev, [key]: t('grades.negativeNotAllowed') }));
      return;
    }
    if (num > cellMax) {
      setErrors((prev) => ({ ...prev, [key]: t('grades.maxExceeded', { max: cellMax }) }));
      return;
    }

    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setGradeMap((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), score: num },
    }));
  };

  const handleKeyDown = (e, studentId, tsId, colIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const subjList = availableSubjects.length > 0 ? availableSubjects : subjects;
      const nextSubj = subjList[colIdx + 1];
      if (nextSubj) {
        const nextTs = teacherSubjectMap[nextSubj.id];
        const nextTsId = nextTs?.id;
        if (nextTsId) {
          const nextRef = cellRefs.current[`${studentId}-${nextTsId}`];
          if (nextRef) nextRef.focus();
        }
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.target.blur();
    }
  };

  const studentAverages = React.useMemo(() => {
    const subjList = availableSubjects.length > 0 ? availableSubjects : subjects;
    if (!students.length || !subjList.length) return [];
    const data = students.map((s) => {
      let totalWeighted = 0;
      let totalCoeff = 0;
      let totalRaw = 0;
      let subjectCount = 0;

      subjList.forEach((subj) => {
        const ts = teacherSubjectMap[subj.id];
        const score = ts ? getScore(s.id, ts.id) : null;
        if (score != null) {
          const coeff = subj.coefficient || 1;
          totalWeighted += score * coeff;
          totalCoeff += coeff;
          totalRaw += score;
          subjectCount++;
        }
      });

      const avg = totalCoeff > 0 ? totalWeighted / totalCoeff : null;
      const avgRounded = avg != null ? parseFloat(avg.toFixed(2)) : null;
      return {
        student: s,
        avg: avgRounded,
        total: parseFloat(totalRaw.toFixed(2)),
        subjectsCount: subjectCount,
      };
    });

    const sorted = [...data].sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
    return data.map((d) => ({
      ...d,
      rank: sorted.indexOf(d) + 1,
    }));
  }, [gradeMap, students, subjects, teacherSubjectMap]);

  const handleSave = async () => {
    const allowedTsIds = user?.profile?.role === 'enseignant'
      ? new Set(teacherAssignments.map((a) => a.id))
      : null;
    const toSave = [];
    Object.entries(gradeMap).forEach(([key, data]) => {
      if (data.score == null) return;
      const [sid, tsid] = key.split('-');
      if (allowedTsIds && !allowedTsIds.has(parseInt(tsid))) return;
      if (data.id) {
        toSave.push({ type: 'update', id: data.id, data: { composition: data.score } });
      } else {
        toSave.push({
          type: 'create',
          data: { student_id: parseInt(sid), teacher_subject_id: parseInt(tsid), term_id: parseInt(selectedTerm), composition: data.score },
        });
      }
    });

    if (toSave.length === 0) { showModal('info', t('grades.info'), t('grades.noGradesToSave')); return; }

    setSaving(true);
    try {
      const BATCH_SIZE = 10;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        const batch = toSave.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map((item) =>
            item.type === 'update' ? gradeService.update(item.id, item.data) : gradeService.create(item.data)
          )
        );
      }

      const gradeRes = await gradeService.getAll({ class_id: selectedClass, term_id: selectedTerm });
      const gradeList = gradeRes.data.results || gradeRes.data;
      const map = {};
      gradeList.forEach((g) => {
        const sid = g.student?.id || g.student_id;
        const tsid = g.teacher_subject || g.teacher_subject_id;
        if (sid && tsid) map[`${sid}-${tsid}`] = { id: g.id, score: g.composition != null ? parseFloat(g.composition) : null, locked: g.locked || false };
      });
      setGradeMap(map);
      showModal('success', t('grades.success'), t('grades.saved', { count: toSave.length }));
    } catch (e) { showModal('error', t('grades.error'), t('grades.saveError')); }
    finally { setSaving(false); }
  };

  const handleExportPDF = () => {
    const subjList = availableSubjects.length > 0 ? availableSubjects : subjects;
    if (!students.length || !subjList.length) { showModal('info', t('grades.info'), t('grades.noData')); return; }

    const doc = new jsPDF('l', 'mm', 'A4');
    const pw = doc.internal.pageSize.getWidth();
    const cls = classObj;
    const term = terms.find((t) => t.id === parseInt(selectedTerm));
    const termName = term?.name || '';

    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(t('grades.pdfTitle'), pw / 2, 15, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    const info = `${t('grades.class')}: ${cls?.display_name || cls?.name || ''} | ${t('grades.term')}: ${termName} | ${t('grades.cycle')}: ${cycleName} | ${t('grades.maxScore')}: ${maxScoreLabel}`;
    doc.text(info, pw / 2, 22, { align: 'center' });
    doc.text(`${t('grades.generatedOn')} ${new Date().toLocaleDateString('fr-FR')}`, pw / 2, 28, { align: 'center' });

    const head = [t('grades.num'), t('grades.matricule'), t('grades.lastName'), t('grades.firstName'), ...subjList.map((s) => s.name), t('grades.avg'), t('grades.total'), t('grades.mention')];
    const body = studentAverages
      .filter((sa) => !search || `${sa.student.first_name} ${sa.student.last_name}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => mentionSortKey(a) - mentionSortKey(b) || (b.avg ?? -1) - (a.avg ?? -1))
      .map((sa, i) => [
        i + 1,
        sa.student.matricule || EMPTY,
        sa.student.last_name || '',
        sa.student.first_name || '',
        ...subjList.map((subj) => {
          const ts = teacherSubjectMap[subj.id];
          const score = ts ? getScore(sa.student.id, ts.id) : null;
          return score != null ? score.toString() : '';
        }),
        sa.avg != null ? sa.avg.toFixed(2) : EMPTY,
        sa.total != null ? sa.total.toFixed(2) : EMPTY,
        sa.avg != null ? getMention(sa.avg, maxScore).label : EMPTY,
      ]);

    autoTable(doc, {
      startY: 33,
      head: [head],
      body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'left', cellWidth: 30 }, 3: { halign: 'left', cellWidth: 25 } },
      didDrawPage: (data) => {
        doc.setFontSize(7);
        doc.text(`${t('grades.page')} ${doc.getCurrentPageInfo().pageNumber}`, pw - 15, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
      },
    });
    doc.save(`Notes_${cls?.name || 'classe'}.pdf`);
  };

  const handleExportExcel = () => {
    const subjList = availableSubjects.length > 0 ? availableSubjects : subjects;
    if (!students.length || !subjList.length) { showModal('info', t('grades.info'), t('grades.noData')); return; }

    let csv = `${t('grades.num')},${t('grades.matricule')},${t('grades.lastName')},${t('grades.firstName')}`;
    subjList.forEach((s) => { csv += `,${s.name}`; });
    csv += `,${t('grades.average')},${t('grades.total')},${t('grades.mention')}\n`;

    studentAverages
      .filter((sa) => !search || `${sa.student.first_name} ${sa.student.last_name}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => mentionSortKey(a) - mentionSortKey(b) || (b.avg ?? -1) - (a.avg ?? -1))
      .forEach((sa, i) => {
        csv += `${i + 1},${sa.student.matricule || ''},"${sa.student.last_name || ''}","${sa.student.first_name || ''}"`;
        subjList.forEach((subj) => {
          const ts = teacherSubjectMap[subj.id];
          const score = ts ? getScore(sa.student.id, ts.id) : null;
          csv += `,${score != null ? score : ''}`;
        });
        csv += `,${sa.avg != null ? sa.avg.toFixed(2) : ''},${sa.total != null ? sa.total.toFixed(2) : ''},"${sa.avg != null ? getMention(sa.avg, maxScore).label : ''}"\n`;
      });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Notes_${classObj?.name || 'classe'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const subjList = availableSubjects.length > 0 ? availableSubjects : subjects;
    const printWin = window.open('', '_blank');
    if (!printWin) { showModal('warning', t('grades.popupBlocked'), t('grades.allowPopups')); return; }

    const cls = classObj;
    const term = terms.find((t) => t.id === parseInt(selectedTerm));
    const termName = term?.name || '';

    let rows = '';
    studentAverages
      .filter((sa) => !search || `${sa.student.first_name} ${sa.student.last_name}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => mentionSortKey(a) - mentionSortKey(b) || (b.avg ?? -1) - (a.avg ?? -1))
      .forEach((sa, i) => {
        rows += '<tr>';
        rows += `<td>${i + 1}</td><td>${sa.student.matricule || EMPTY}</td><td>${sa.student.last_name || ''}</td><td>${sa.student.first_name || ''}</td>`;
        subjList.forEach((subj) => {
          const ts = teacherSubjectMap[subj.id];
          const score = ts ? getScore(sa.student.id, ts.id) : null;
          rows += `<td>${score != null ? score : ''}</td>`;
        });
        rows += `<td><strong>${sa.avg != null ? sa.avg.toFixed(2) : EMPTY}</strong></td>`;
        rows += `<td>${sa.total != null ? sa.total.toFixed(2) : EMPTY}</td>`;
        rows += `<td>${sa.avg != null ? getMention(sa.avg, maxScore).label : EMPTY}</td>`;
        rows += '</tr>';
      });

    let subjHeaders = '';
    subjList.forEach((s) => { subjHeaders += `<th>${s.name}</th>`; });

    printWin.document.write(`
      <html><head><title>${t('grades.printTitle')}</title>
      <style>
        @page { size: landscape; margin: 15mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #333; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
        th { background: ${schoolInfo?.primary_color || '#1e3a5f'}; color: #fff; font-size: 10px; }
        td { font-size: 10px; }
        tr:nth-child(even) { background: #f8fafc; }
        h2 { text-align: center; color: ${schoolInfo?.primary_color || '#1e3a5f'}; margin: 5px 0; }
        .info { text-align: center; color: #666; font-size: 12px; margin-bottom: 15px; }
      </style></head><body>
      ${buildSchoolHeaderHTML(schoolInfo)}
      <h2>${t('grades.pdfTitle')}</h2>
      <div class="info">${t('grades.class')}: ${cls?.display_name || cls?.name || ''} | ${t('grades.term')}: ${termName} | ${maxScoreLabel}</div>
      <table><thead><tr>
        <th>${t('grades.num')}</th><th>${t('grades.matricule')}</th><th>${t('grades.lastName')}</th><th>${t('grades.firstName')}</th>
        ${subjHeaders}
        <th>${t('grades.avg')}</th><th>${t('grades.total')}</th><th>${t('grades.mention')}</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <p style="text-align:center;color:#999;font-size:10px;margin-top:20px;">
        ${t('grades.generatedOn')} ${new Date().toLocaleDateString('fr-FR')}
      </p>
      </body></html>
    `);
    printWin.document.close();
    setTimeout(() => printWin.print(), 500);
  };

  const handleImport = async () => {
    if (!importFile || !selectedClass || !selectedTerm) { showModal('warning', t('grades.missingFile'), t('grades.selectFilePrompt')); return; }
    setImporting(true);
    setImportResult(null);
    const data = new FormData();
    data.append('file', importFile);
    data.append('class_id', selectedClass);
    data.append('subject_id', '');
    data.append('term_id', selectedTerm);
    try {
      const resp = await gradeService.importExcel(data);
      setImportResult(resp.data);
      await loadData();
    } catch (err) { setImportResult({ error: err.response?.data?.error || t('grades.importError') }); }
    finally { setImporting(false); }
  };

  const filtered = studentAverages
    .filter((sa) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const s = sa.student;
      return `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.matricule || '').toLowerCase().includes(q);
    })
    .sort((a, b) => mentionSortKey(a) - mentionSortKey(b) || (b.avg ?? -1) - (a.avg ?? -1));

  return (
    <div className="space-y-4 pb-8">

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('grades.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('grades.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{t('grades.sheetTitle')}</p>
              {classObj && (
                <p className="text-blue-200 text-sm mt-0.5">
                  {classObj.display_name || classObj.name}
                  {cycleName ? ` • ${cycleName.charAt(0).toUpperCase() + cycleName.slice(1)}` : ''}
                  {maxScore > 0 ? ` • Notation ${maxScoreLabel}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-200 text-xs">{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('grades.class')}</label>
              <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); loadedDataRef.current = ''; }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">{t('grades.select')}</option>
                {availableClasses.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('grades.term')}</label>
              <select value={selectedTerm} onChange={(e) => { setSelectedTerm(e.target.value); loadedDataRef.current = ''; }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">{t('grades.select')}</option>
                {terms.length === 0 ? (
                  <option value="" disabled>{t('settings.preferences.noSemesters')}</option>
                ) : (
                  terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('grades.cycle')}</label>
              <input type="text" value={cycleName ? cycleName.charAt(0).toUpperCase() + cycleName.slice(1) : EMPTY} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('grades.maxScore')}</label>
              <input type="text" value={maxScoreLabel} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-blue-50 text-blue-700 font-bold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('grades.studentsLabel')}</label>
              <input type="text" value={`${t('grades.studentsWithCount', { count: students.length })} • ${t('grades.subjectsWithCount', { count: subjects.length })}`} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {!selectedClass || !selectedTerm ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
          <FileSpreadsheet className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('grades.inputTitle')}</h3>
          <p className="text-sm text-gray-500">{t('grades.selectPrompt')}</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder={t('grades.searchStudent')} value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white" />
                </div>
                <span className="text-xs text-gray-500">{filtered.length} / {students.length}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100">
                  <Upload className="w-3.5 h-3.5" /> {t('grades.import')}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                  <Save className="w-3.5 h-3.5" /> {saving ? '' : t('grades.save')}
                </button>
                <button onClick={handleExportPDF} disabled={!students.length}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                  <Download className="w-3.5 h-3.5" /> {t('grades.pdf')}
                </button>
                <button onClick={handleExportExcel} disabled={!students.length}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> {t('grades.excel')}
                </button>
                <button onClick={handlePrint} disabled={!students.length}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Printer className="w-3.5 h-3.5" /> {t('grades.print')}
                </button>
              </div>
            </div>

            <div className="overflow-auto" ref={tableRef}>
              <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed', minWidth: Math.max(availableSubjects.length, subjects.length) * 65 + 522 }}>
                <thead>
                  <tr className="sticky top-0 z-20">
                    <th rowSpan={2} className="sticky left-0 z-30 bg-gradient-to-b from-blue-900 to-blue-800 text-white px-1.5 py-2 text-[10px] font-semibold uppercase tracking-wider border-r border-blue-700 w-8 text-center">
                      {t('grades.num')}
                    </th>
                    <th rowSpan={2} className="sticky left-[32px] z-30 bg-gradient-to-b from-blue-900 to-blue-800 text-white px-1 py-2 text-[9px] font-semibold uppercase tracking-wider border-r border-blue-700 w-[45px] text-center">
                      {t('grades.photo')}
                    </th>
                    <th rowSpan={2} className="sticky left-[77px] z-30 bg-gradient-to-b from-blue-900 to-blue-800 text-white px-2 py-2 text-[10px] font-semibold uppercase tracking-wider border-r border-blue-700 w-[70px] text-left">
                      {t('grades.matricule')}
                    </th>
                    <th rowSpan={2} className="sticky left-[147px] z-30 bg-gradient-to-b from-blue-900 to-blue-800 text-white px-2 py-2 text-[10px] font-semibold uppercase tracking-wider border-r border-blue-700 w-[90px] text-left">
                      {t('grades.lastName')}
                    </th>
                    <th rowSpan={2} className="sticky left-[237px] z-30 bg-gradient-to-b from-blue-900 to-blue-800 text-white px-2 py-2 text-[10px] font-semibold uppercase tracking-wider border-r border-blue-700 w-[80px] text-left">
                      {t('grades.firstName')}
                    </th>
                    {availableSubjects.map((s) => (
                      <th key={s.id} colSpan={1} className="bg-gradient-to-b from-blue-900 to-blue-800 text-white px-1 py-2 text-[9px] font-semibold text-center border-r border-blue-700 w-[65px]">
                        <div className="leading-tight truncate">{s.name}</div>
                        <div className="text-[8px] text-blue-300 font-normal mt-0.5">C{s.coefficient || 1} {maxScoreLabel}</div>
                      </th>
                    ))}
                    <th rowSpan={2} className="bg-gradient-to-b from-blue-900 to-blue-800 text-white px-1 py-2 text-[10px] font-semibold text-center border-l border-blue-700 w-[55px]">
                      {t('grades.avg')}
                    </th>
                    <th rowSpan={2} className="bg-gradient-to-b from-blue-900 to-blue-800 text-white px-1 py-2 text-[10px] font-semibold text-center w-[50px]">
                      {t('grades.total')}
                    </th>
                    <th rowSpan={2} className="bg-gradient-to-b from-blue-900 to-blue-800 text-white px-1 py-2 text-[10px] font-semibold text-center w-[65px]">
                      {t('grades.mention')}
                    </th>
                    <th rowSpan={2} className="bg-gradient-to-b from-blue-900 to-blue-800 text-white px-1 py-2 text-[10px] font-semibold text-center w-[35px]">
                      {t('grades.rank')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5 + availableSubjects.length + 4} className="text-center py-12 text-gray-400 text-sm">{t('grades.noStudent')}</td></tr>
                  ) : filtered.map((sa, idx) => (
                    <tr key={sa.student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/40 transition-colors border-b border-gray-100`}>
                      <td className="sticky left-0 z-10 bg-inherit px-1.5 py-1.5 text-xs text-gray-400 font-mono text-center border-r border-gray-100 w-8">
                        {idx + 1}
                      </td>
                      <td className="sticky left-[32px] z-10 bg-inherit px-1 py-1 text-center border-r border-gray-100 w-[45px]">
                        {sa.student.photo_url ? (
                          <img src={sa.student.photo_url} alt="" className="w-8 h-8 rounded-full object-cover mx-auto" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 mx-auto flex items-center justify-center text-[10px] text-gray-400 font-medium">
                            {sa.student.first_name?.[0]}{sa.student.last_name?.[0]}
                          </div>
                        )}
                      </td>
                      <td className="sticky left-[77px] z-10 bg-inherit px-2 py-1.5 text-[11px] text-gray-500 font-mono truncate border-r border-gray-100 w-[70px]">
                        {sa.student.matricule || EMPTY}
                      </td>
                      <td className="sticky left-[147px] z-10 bg-inherit px-2 py-1.5 text-sm font-medium text-gray-900 truncate border-r border-gray-100 w-[90px]">
                        {sa.student.last_name || EMPTY}
                      </td>
                      <td className="sticky left-[237px] z-10 bg-inherit px-2 py-1.5 text-sm text-gray-700 truncate border-r border-gray-100 w-[80px]">
                        {sa.student.first_name || EMPTY}
                      </td>
                      {availableSubjects.map((s, ci) => {
                        const ts = teacherSubjectMap[s.id];
                        const tsId = ts?.id;
                        const score = tsId ? getScore(sa.student.id, tsId) : null;
                        const locked = tsId ? isGradeLocked(sa.student.id, tsId) : false;
                        const key = tsId ? `${sa.student.id}-${tsId}` : null;
                        const err = key ? errors[key] : null;
                        const disabled = locked && !isAdmin;
                        return (
                          <td key={s.id} className="px-0.5 py-0.5 text-center border-r border-gray-100 relative group w-[65px]">
                            {tsId ? (
                              <div className="relative">
                                <input
                                  ref={(el) => { if (key) cellRefs.current[key] = el; }}
                                  type="text"
                                  inputMode="decimal"
                                  defaultValue={score != null ? score.toString() : ''}
                                  onBlur={(e) => { if (!disabled) handleCellChange(sa.student.id, tsId, e.target.value); }}
                                  onKeyDown={(e) => { if (!disabled) handleKeyDown(e, sa.student.id, tsId, ci); }}
                                  disabled={disabled}
                                  className={`w-full px-1 py-1 text-xs text-center rounded border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white focus:shadow-sm hover:bg-blue-50/50 transition-colors ${
                                    err ? 'ring-2 ring-red-300 bg-red-50' : ''
                                  } ${score != null ? getScoreColor(score, maxScore) : 'text-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  placeholder="-"
                                />
                                {locked && (
                                  <button
                                    onClick={() => handleToggleLock(sa.student.id, tsId)}
                                    className={`absolute -top-1 -right-1 p-0.5 rounded-full ${isAdmin ? 'opacity-0 group-hover:opacity-100' : ''} ${isAdmin ? 'hover:bg-yellow-100' : ''} transition-opacity`}
                                    title={locked ? t('grades.locked') : t('grades.unlocked')}
                                  >
                                    <Lock className={`w-3 h-3 ${isAdmin ? 'text-yellow-500' : 'text-gray-300'}`} />
                                  </button>
                                )}
                                {isAdmin && !locked && (
                                  <button
                                    onClick={() => handleToggleLock(sa.student.id, tsId)}
                                    className="absolute -top-1 -right-1 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-green-100 transition-opacity"
                                    title={t('grades.clickToLock')}
                                  >
                                    <Unlock className="w-3 h-3 text-green-500" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-200 cursor-not-allowed" title={t('grades.noTeacher')}>
                                <Ban className="w-3.5 h-3.5" />
                              </div>
                            )}
                            {err && (
                              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none min-w-[120px] text-center leading-tight">
                                {err}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-1 py-1.5 text-center border-l border-gray-100 font-bold text-xs w-[55px]">
                        {sa.avg != null ? (
                          <span className={`${getScoreColor(sa.avg, maxScore)}`}>{sa.avg.toFixed(2)}</span>
                        ) : <span className="text-gray-300">{EMPTY}</span>}
                      </td>
                      <td className="px-1 py-1.5 text-center text-xs font-semibold text-gray-700 w-[50px]">
                        {sa.total != null ? sa.total.toFixed(1) : EMPTY}
                      </td>
                      <td className="px-1 py-1.5 text-center w-[65px]">
                        {sa.avg != null ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getMention(sa.avg, maxScore).color}`}>
                            {getMention(sa.avg, maxScore).label}
                          </span>
                        ) : <span className="text-gray-300">{EMPTY}</span>}
                      </td>
                      <td className="px-1 py-1.5 text-center text-xs font-bold text-blue-600 w-[35px]">
                        {sa.avg != null ? (
                          <span className="flex items-center justify-center gap-0.5">
                            <Award className="w-3 h-3 text-yellow-500" />
                            {sa.rank}<sup className="text-[8px]">{sa.rank === 1 ? t('grades.rankFirst') : t('grades.rankNth')}</sup>
                          </span>
                        ) : EMPTY}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>{t('grades.filteredCount', { count: filtered.length, subjects: subjects.length })}</span>
              <div className="flex items-center gap-3">
                {APPRECIATIONS.map((a) => (
                  <span key={a.key} className="flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${a.color.split(' ')[0]}`} />
                    <span>{t(a.key)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-purple-600" /></div>
                <div><h2 className="text-lg font-bold text-gray-900">{t('grades.importExcel')}</h2><p className="text-sm text-gray-500">{t('grades.importSubtitle')}</p></div>
              </div>
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-800 mb-1">{t('grades.expectedFormat')}</p>
                <p className="text-xs text-blue-600">{t('grades.formatColumns')}</p>
                <p className="text-xs text-blue-600 mt-1">{t('grades.formatNote')}</p>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                {importFile ? (
                  <div className="text-center"><FileSpreadsheet className="w-8 h-8 text-green-600 mx-auto mb-1" /><p className="text-sm font-medium text-gray-700">{importFile.name}</p><p className="text-xs text-gray-400">{(importFile.size / 1024).toFixed(1)} Ko</p></div>
                ) : (
                  <div className="text-center"><Upload className="w-8 h-8 text-gray-300 mx-auto mb-1" /><p className="text-sm text-gray-500">{t('grades.clickToSelect')}</p></div>
                )}
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setImportFile(e.target.files[0])} />
              </label>
              {importResult && (
                <div className={`rounded-lg p-3 ${importResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {importResult.error ? (
                    <div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" /><p className="text-sm text-red-700">{importResult.error}</p></div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /><p className="text-sm font-medium text-green-700">{importResult.message}</p></div>
                      {importResult.total_errors > 0 && (
                        <div className="mt-2 max-h-24 overflow-y-auto">
                          <p className="text-xs font-medium text-red-600">{t('grades.errorCount', { count: importResult.total_errors })}</p>
                          {importResult.errors?.slice(0, 5).map((err, i) => <p key={i} className="text-xs text-red-500">{t('grades.line')} {err.row}: {err.error}</p>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">{t('grades.cancel')}</button>
              <button onClick={handleImport} disabled={!importFile || importing} className="px-5 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                {importing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>{t('grades.importing')}</span></> : <><Upload className="w-4 h-4" /><span>{t('grades.importButton')}</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Grades;
