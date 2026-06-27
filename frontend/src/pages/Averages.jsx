import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, FileText } from 'lucide-react';
import { gradeService, classService, studentService } from '../services/api';
import MessageModal from '../components/MessageModal';

const Averages = () => {
  const { t } = useTranslation();
  const [averages, setAverages] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('averages.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    Promise.all([gradeService.getAllAverages(), classService.getAll(), gradeService.getAllTerms(), studentService.getAll()])
      .then(([a, c, t, s]) => {
        setAverages(a.data.results || a.data);
        setClasses(c.data.results || c.data);
        setTerms(t.data.results || t.data);
        setStudents(s.data.results || s.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStudentById = (studentId) => {
    return students.find((s) => s.id === studentId);
  };

  const getStudentName = (avg) => {
    if (typeof avg.student === 'object') {
      return `${avg.student?.first_name || ''} ${avg.student?.last_name || ''}`.trim() || avg.student?.full_name || t('averages.student');
    }
    const s = getStudentById(avg.student_id || avg.student);
    if (s) return `${s.first_name} ${s.last_name}`;
    return String(avg.student);
  };

  const getStudentId = (avg) => {
    if (typeof avg.student === 'object') return avg.student?.id;
    return avg.student_id || avg.student;
  };

  const getAppreciation = (avg) => {
    const a = parseFloat(avg);
    if (isNaN(a)) return '\u2014';
    if (a >= 16) return t('averages.excellent');
    if (a >= 14) return t('averages.good');
    if (a >= 12) return t('averages.fairlyGood');
    if (a >= 10) return t('averages.passing');
    return t('averages.insufficient');
  };

  const handlePrintBulletin = async (avg) => {
    const studentId = getStudentId(avg);
    const termId = avg.term_id || avg.term;
    if (!studentId || !termId) {
      showModal('warning', t('averages.insufficientData'), t('averages.insufficientDataMsg'));
      return;
    }
    try {
      const response = await gradeService.getBulletinPdf(studentId, termId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const s = getStudentById(studentId);
      link.setAttribute('download', `bulletin_${s ? s.matricule : studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showModal('error', t('averages.error'), t('averages.bulletinError'));
    }
  };

  const filtered = averages
    .filter((a) => {
      if (selectedTerm && (a.term_id !== parseInt(selectedTerm) && a.term !== selectedTerm)) return false;
      return true;
    })
    .filter((a) => {
      if (search === '') return true;
      const name = getStudentName(a).toLowerCase();
      return name.includes(search.toLowerCase());
    })
    .sort((a, b) => (a.rank || 999) - (b.rank || 999));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('averages.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('averages.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('averages.searchStudent')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('averages.searchStudent')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('averages.class')}</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('results.select')}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('averages.term')}</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('results.select')}</option>
              {terms.length === 0 ? (
                <option value="" disabled>{t('settings.preferences.noSemesters')}</option>
              ) : (
                terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="px-6 py-3 font-medium">{t('averages.rank')}</th>
              <th className="px-6 py-3 font-medium">{t('averages.student')}</th>
              <th className="px-6 py-3 font-medium">{t('averages.average')}</th>
              <th className="px-6 py-3 font-medium">{t('averages.term')}</th>
              <th className="px-6 py-3 font-medium">{t('averages.appreciation')}</th>
              <th className="px-6 py-3 font-medium">{t('averages.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('averages.noData')}</td></tr>
            ) : (
              filtered.map((a, i) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      a.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      a.rank === 2 ? 'bg-gray-200 text-gray-700' :
                      a.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {a.rank || i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{getStudentName(a)}</td>
                  <td className="px-6 py-4">
                    <span className={`text-lg font-bold ${
                      parseFloat(a.average) >= 16 ? 'text-green-600' :
                      parseFloat(a.average) >= 12 ? 'text-blue-600' :
                      parseFloat(a.average) >= 10 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {a.average}/20
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{typeof a.term === 'object' ? a.term?.name : a.term}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{getAppreciation(a.average)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handlePrintBulletin(a)}
                      className="flex items-center space-x-2 text-purple-600 hover:bg-purple-50 px-3 py-1 rounded-lg transition-colors"
                      title={t('averages.bulletinTitle')}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{t('averages.bulletin')}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Averages;
