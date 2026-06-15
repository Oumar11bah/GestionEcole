import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search, Calendar, Check, X, Clock, Save, RefreshCw, Filter } from 'lucide-react';
import { attendanceService, classService, studentService } from '../services/api';
import MessageModal from '../components/MessageModal';

const Attendance = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [markingMode, setMarkingMode] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('attendance.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    classService.getAll()
      .then((c) => setClasses(c.data.results || c.data))
      .catch(() => {});
    attendanceService.getAll()
      .then((a) => setRecords(a.data.results || a.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (searchParams.get('action') === 'mark') setMarkingMode(true);
  }, []);

  useEffect(() => {
    if (selectedClass) {
      studentService.getAll({ class_id: selectedClass })
        .then((r) => {
          const studentList = r.data.results || r.data;
          setStudents(studentList);
        })
        .catch(() => {});
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  const getStudentName = (record) => {
    if (typeof record.student === 'object') {
      return `${record.student?.first_name || ''} ${record.student?.last_name || ''}`.trim() || record.student?.name || t('attendance.student');
    }
    if (typeof record.student === 'string') return record.student;
    if (typeof record.student === 'number') return `${t('attendance.student')} #${record.student}`;
    return t('attendance.student');
  };

  const getClassName = (student) => {
    if (!student) return '—';
    if (typeof student.class_assigned === 'object' && student.class_assigned?.name) {
      return student.class_assigned.name;
    }
    if (student.class_assigned) {
      const c = classes.find((cl) => cl.id === student.class_assigned);
      return c?.display_name || c?.name || '—';
    }
    return '—';
  };

  const getStatusBadge = (status) => {
    const map = {
      present: { icon: Check, color: 'bg-green-100 text-green-700', label: t('attendance.present') },
      absent: { icon: X, color: 'bg-red-100 text-red-700', label: t('attendance.absent') },
      late: { icon: Clock, color: 'bg-orange-100 text-orange-700', label: t('attendance.late') },
      excused: { icon: Check, color: 'bg-blue-100 text-blue-700', label: t('attendance.excused') },
    };
    const { icon: Icon, color, label } = map[status] || map.present;
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  };

  const handleMarkPresence = () => {
    if (!selectedClass) {
      showModal('warning', t('attendance.missingClass'), t('attendance.selectClassPrompt'));
      return;
    }
    setMarkingMode(true);
    const initial = {};
    students.forEach((s) => {
      const existing = records.find(
        (r) => (r.student?.id || r.student) === s.id && r.date === selectedDate
      );
      initial[s.id] = {
        status: existing?.status || 'present',
        comment: existing?.comment || '',
      };
    });
    setAttendanceData(initial);
  };

  const updateAttendance = (studentId, field, value) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const promises = students.map((student) => {
        const data = attendanceData[student.id];
        if (!data) return Promise.resolve();
        const existing = records.find(
          (r) => (r.student?.id || r.student) === student.id && r.date === selectedDate
        );
        if (existing) {
          return attendanceService.update(existing.id, {
            student_id: student.id,
            date: selectedDate,
            status: data.status,
            comment: data.comment,
          });
        }
        return attendanceService.create({
          student_id: student.id,
          date: selectedDate,
          status: data.status,
          comment: data.comment,
        });
      });
      await Promise.all(promises);
      showModal('success', t('attendance.success'), t('attendance.savedSuccess'));
      const updatedRecords = await attendanceService.getAll();
      setRecords(updatedRecords.data.results || updatedRecords.data);
      setMarkingMode(false);
    } catch (error) {
      console.error('Failed to save attendance:', error);
      showModal('error', t('attendance.error'), t('attendance.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const filtered = records.filter((r) => {
    const matchSearch = search === '' || getStudentName(r).toLowerCase().includes(search.toLowerCase());
    const matchDate = selectedDate === '' || r.date === selectedDate;
    const matchClass =
      selectedClass === '' ||
      (typeof r.student === 'object' && r.student?.class_assigned === parseInt(selectedClass)) ||
      (typeof r.student === 'object' && r.student?.class_assigned?.id === parseInt(selectedClass));
    const matchStatus = filterStatus === '' || r.status === filterStatus;
    return matchSearch && matchDate && matchClass && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64">{t('attendance.loading')}</div>;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('attendance.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('attendance.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {markingMode && (
            <button
              onClick={() => setMarkingMode(false)}
              className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              <span>{t('attendance.cancel')}</span>
            </button>
          )}
          <button
            onClick={markingMode ? handleSaveAttendance : handleMarkPresence}
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : markingMode ? (
              <Save className="w-4 h-4" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            <span>{saving ? t('attendance.saving') : markingMode ? t('attendance.save') : t('attendance.markPresence')}</span>
          </button>
        </div>
      </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('attendance.searchStudent')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('attendance.searchStudent')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('attendance.date')}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('attendance.class')}</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                if (markingMode) setMarkingMode(false);
              }}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('results.select')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('attendance.status')}</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('results.select')}</option>
              <option value="present">{t('attendance.present')}</option>
              <option value="late">{t('attendance.late')}</option>
              <option value="absent">{t('attendance.absent')}</option>
              <option value="excused">{t('attendance.excused')}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            {t('attendance.recordCount', { count: filtered.length })}
          </div>
          <button
            onClick={() => { setSearch(''); setSelectedDate(new Date().toISOString().split('T')[0]); setSelectedClass(''); setFilterStatus(''); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('attendance.reset')}
          </button>
        </div>
      </div>

      {markingMode ? (
<div className="bg-white rounded-xl shadow overflow-x-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{t('attendance.markTitle')}</h3>
            </div>
            <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium w-12">{t('attendance.photo')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.matricule')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.studentColumn')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.class')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.status')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.comment')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const data = attendanceData[student.id] || { status: 'present', comment: '' };
                return (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium border border-gray-200">
                          {(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{student.matricule || '\u2014'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{getClassName(student)}</td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        {[
                          { value: 'present', label: t('attendance.present'), color: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' },
                          { value: 'late', label: t('attendance.lateStatus'), color: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200' },
                          { value: 'absent', label: t('attendance.absent'), color: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' },
                          { value: 'excused', label: t('attendance.excused'), color: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateAttendance(student.id, 'status', opt.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                              data.status === opt.value
                                ? opt.color + ' ring-2 ring-offset-1 ring-current'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={data.comment}
                        onChange={(e) => updateAttendance(student.id, 'comment', e.target.value)}
                        className="w-48 border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('attendance.optional')}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium w-12">{t('attendance.photo')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.matricule')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.studentColumn')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.class')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.date')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.status')}</th>
                <th className="px-4 py-3 font-medium">{t('attendance.comment')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">{t('attendance.noRecords')}</td></tr>
              ) : (
                filtered.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {record.student?.photo_url ? (
                        <img src={record.student.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-medium border border-gray-200">
                          {(record.student?.first_name?.[0] || '') + (record.student?.last_name?.[0] || '')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{record.student?.matricule || '\u2014'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{record.student?.first_name ? `${record.student.first_name} ${record.student.last_name}` : getStudentName(record)}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{getClassName(record.student)}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(record.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{record.comment || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Attendance;
