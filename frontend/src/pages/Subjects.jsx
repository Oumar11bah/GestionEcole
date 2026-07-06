import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { subjectService } from '../services/api';
import MessageModal from '../components/MessageModal';

const Subjects = () => {
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('common.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    subjectService.getAll()
      .then((r) => setSubjects(r.data.results || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = subjects.filter((s) =>
    search === '' || `${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    showModal('warning', t('subjects.confirmTitle'), t('subjects.confirmDelete'), async () => {
      try {
        await subjectService.delete(id);
        setSubjects(subjects.filter((s) => s.id !== id));
        closeModal();
      } catch (error) {
        showModal('error', t('common.error'), t('subjects.deleteError'));
      }
    });
  };

  const getCycleBadges = (cycleDetails) => {
    if (!Array.isArray(cycleDetails) || cycleDetails.length === 0) return <span className="text-gray-400 text-xs">--</span>;
    const labels = { primaire: 'bg-green-100 text-green-700', college: 'bg-blue-100 text-blue-700', lycee: 'bg-purple-100 text-purple-700', prescolaire: 'bg-orange-100 text-orange-700' };
    const names = { primaire: t('subjects.cyclePrimaire'), college: t('subjects.cycleCollege'), lycee: t('subjects.cycleLycee'), prescolaire: t('subjects.cyclePrescolaire') };
    return (
      <div className="flex space-x-1">
        {cycleDetails.map((c) => {
          const name = c.name || c;
          return (
            <span key={c.id || name} className={`px-2 py-0.5 rounded-full text-xs font-medium ${labels[name] || 'bg-gray-100 text-gray-700'}`}>
              {names[name] || name}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('subjects.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('subjects.subtitle')}</p>
          </div>
          <Link
            to="/subjects/new"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('subjects.add')}</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('subjects.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="px-6 py-3 font-medium">{t('subjects.code')}</th>
              <th className="px-6 py-3 font-medium">{t('subjects.name')}</th>
              <th className="px-6 py-3 font-medium">{t('subjects.coefficient')}</th>
              <th className="px-6 py-3 font-medium">{t('subjects.cycles')}</th>
              <th className="px-6 py-3 font-medium">{t('subjects.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t('subjects.notFound')}</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">{s.code}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{t('subjects.coefficientValue', { coefficient: s.coefficient })}</span>
                  </td>
                  <td className="px-6 py-4">{getCycleBadges(s.cycle_details || s.cycle)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Link to={`/subjects/${s.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></Link>
                      <Link to={`/subjects/${s.id}/edit`} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"><Pencil className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
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

export default Subjects;
