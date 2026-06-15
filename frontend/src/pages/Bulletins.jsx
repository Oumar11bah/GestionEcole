import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Eye, Search, AlertCircle } from 'lucide-react';
import { gradeService, studentService, classService } from '../services/api';
import MessageModal from '../components/MessageModal';

const Bulletins = () => {
  const { t } = useTranslation();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('bulletins.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    Promise.all([
      classService.getAll(),
      gradeService.getAllTerms(),
    ]).then(([cls, trm]) => {
      setClasses(cls.data.results || cls.data);
      setTerms(trm.data.results || trm.data);
    });
  }, []);

  const fetchStudents = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await studentService.getAll({ class_id: selectedClass });
      setStudents(res.data.results || res.data);
    } catch (e) {
      showModal('error', t('bulletins.error'), t('bulletins.loadError'));
      setStudents([]);
    }
    finally { setLoading(false); }
  }, [selectedClass]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const downloadPdf = async (studentId, matricule) => {
    if (!selectedTerm) return;
    try {
      const res = await gradeService.getBulletinPdf(studentId, selectedTerm);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${matricule}_${selectedTerm}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      showModal('error', t('bulletins.error'), t('bulletins.downloadFailed', { matricule, message: e.message }));
    }
  };

  const downloadAll = async () => {
    if (!selectedClass || !selectedTerm) return;
    try {
      const cls = classes.find((c) => c.id === parseInt(selectedClass));
      const name = cls?.display_name || cls?.name || selectedClass;
      const res = await gradeService.getBulletinsBatchPdf(selectedClass, selectedTerm);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletins_${name}_${selectedTerm}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      showModal('error', t('bulletins.error'), t('bulletins.batchDownloadError', { message: e.message }));
    }
  };

  const previewBulletin = async (studentId) => {
    if (!selectedTerm) return;
    try {
      const win = window.open('', '_blank');
      if (!win) { showModal('warning', t('bulletins.popupBlocked'), t('bulletins.popupDetected')); return; }
      win.document.write(`<div style="font-family:sans-serif;text-align:center;padding:40px;color:#666;">${t('bulletins.loadingBulletin')}</div>`);
      const res = await gradeService.getBulletinPdf(studentId, selectedTerm);
      const url = window.URL.createObjectURL(res.data);
      win.location.href = url;
    } catch (e) {
      showModal('error', t('bulletins.error'), t('bulletins.previewFailed', { message: e.message }));
    }
  };

  const filtered = students.filter((s) => {
    if (!search) return true;
    const name = `${s.first_name} ${s.last_name} ${s.matricule}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const activeFilterCount = (search !== '' ? 1 : 0);

  return (
    <div className="space-y-4 pb-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('bulletins.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('bulletins.subtitle')}</p>
          </div>
          {selectedTerm && filtered.length > 0 && (
            <button onClick={downloadAll}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
              <Download className="w-4 h-4" /> {t('bulletins.downloadAll', { count: filtered.length })}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('bulletins.class')}</label>
            <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">{t('bulletins.select')}</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('bulletins.term')}</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">{t('bulletins.select')}</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('bulletins.search')}</label>
            <Search className="absolute left-3 top-[38px] w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t('bulletins.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="text-xs text-gray-400">
            {t('bulletins.studentCount', { count: filtered.length })}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <span className="text-xs text-orange-500 font-medium">{t('bulletins.filterCount', { count: activeFilterCount })}</span>
            )}
              <button onClick={() => { setSearch(''); setSelectedClass(''); setSelectedTerm(''); setStudents([]); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                {t('bulletins.reset')}
              </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="px-6 py-3.5 font-semibold">{t('bulletins.photo')}</th>
                <th className="px-6 py-3.5 font-semibold">{t('bulletins.matricule')}</th>
                <th className="px-6 py-3.5 font-semibold">{t('bulletins.firstName')}</th>
                <th className="px-6 py-3.5 font-semibold">{t('bulletins.lastName')}</th>
                <th className="px-6 py-3.5 font-semibold">{t('bulletins.class')}</th>
                <th className="px-6 py-3.5 font-semibold">{t('bulletins.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400 text-sm">
                  {loading ? t('bulletins.loading') : !selectedClass ? t('bulletins.selectPrompt') : t('bulletins.noStudent')}
                </td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-2">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-medium">
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 text-sm">{s.matricule}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{s.first_name}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{s.last_name}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{s.class_assigned_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => previewBulletin(s.id)} disabled={!selectedTerm}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title={t('bulletins.preview')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => downloadPdf(s.id, s.matricule)} disabled={!selectedTerm}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title={t('bulletins.download')}>
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => window.open(`/students/${s.id}`, '_blank')}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title={t('bulletins.profile')}>
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
            {t('bulletins.footerCount', { filtered: filtered.length, total: students.length })}
          </div>
        )}
      </div>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Bulletins;
