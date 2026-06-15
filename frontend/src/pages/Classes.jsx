import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import { classService } from '../services/api';
import MessageModal from '../components/MessageModal';

const Classes = () => {
  const { t } = useTranslation();
  const SERIES_LABELS = {
    maths: t('classes.seriesMaths'),
    experimental: t('classes.seriesExperimental'),
    sociales: t('classes.seriesSociales'),
    lettres: t('classes.seriesLettres'),
    none: '',
  };
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCycle, setFilterCycle] = useState('all');
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('classes.confirmLabel') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll({ page_size: 100 });
      setClasses(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    showModal('warning', t('classes.confirmDeleteTitle'), t('classes.confirmDeleteMessage'), async () => {
      try {
        await classService.delete(id);
        fetchClasses();
        closeModal();
      } catch (error) {
        showModal('error', t('classes.errorTitle'), t('classes.errorDelete'));
      }
    });
  };

  const filtered = classes.filter((c) => {
    const cycleName = c.cycle?.name || c.cycle_name || '';
    const matchSearch = search === '' || `${c.name} ${cycleName}`.toLowerCase().includes(search.toLowerCase());
    const matchCycle = filterCycle === 'all' || cycleName === filterCycle;
    return matchSearch && matchCycle;
  });

  if (loading) return <div className="flex items-center justify-center h-64">{t('classes.loading')}</div>;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('classes.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('classes.subtitle')}</p>
          </div>
          <Link
            to="/classes/new"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('classes.addButton')}</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('classes.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCycle}
            onChange={(e) => setFilterCycle(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('classes.filterAllCycles')}</option>
            <option value="primaire">{t('classes.filterPrimaire')}</option>
            <option value="college">{t('classes.filterCollege')}</option>
            <option value="lycee">{t('classes.filterLycee')}</option>
          </select>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            {t('classes.count', { count: filtered.length })}
          </div>
          <button onClick={() => { setSearch(''); setFilterCycle('all'); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {t('classes.reset')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="px-6 py-3 font-medium">{t('classes.headerName')}</th>
              <th className="px-6 py-3 font-medium">{t('classes.headerCycle')}</th>
              <th className="px-6 py-3 font-medium">{t('classes.headerSeries')}</th>
              <th className="px-6 py-3 font-medium">{t('classes.headerAcademicYear')}</th>
              <th className="px-6 py-3 font-medium">{t('classes.headerStudents')}</th>
              <th className="px-6 py-3 font-medium">{t('classes.headerActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('classes.empty')}</td></tr>
            ) : (
              filtered.map((classe) => {
                const cycleName = classe.cycle?.name || classe.cycle_name || '';
                const specialty = classe.specialty || 'none';
                const seriesLabel = SERIES_LABELS[specialty] || '';
                return (
                  <tr key={classe.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{classe.display_name || classe.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cycleName === 'primaire' ? 'bg-green-100 text-green-700' :
                        cycleName === 'college' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {cycleName === 'primaire' ? t('classes.cyclePrimaire') : cycleName === 'college' ? t('classes.cycleCollege') : t('classes.cycleLycee')}
                      </span>
                    </td>
                <td className="px-6 py-4 text-gray-600">
                  {cycleName === 'lycee' && classe.specialty && classe.specialty !== 'none' ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {SERIES_LABELS[classe.specialty] || classe.specialty}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">--</span>
                  )}
                </td>
                    <td className="px-6 py-4 text-gray-600">{classe.academic_year}</td>
                    <td className="px-6 py-4 text-gray-600">{classe.student_count || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Link to={`/classes/${classe.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title={t('classes.viewTitle')}><Eye className="w-4 h-4" /></Link>
                        <Link to={`/classes/${classe.id}/edit`} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"><Pencil className="w-4 h-4" /></Link>
                        <button onClick={() => handleDelete(classe.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default Classes;