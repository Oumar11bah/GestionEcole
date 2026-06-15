import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import { teacherService } from '../services/api';
import MessageModal from '../components/MessageModal';

const PHOTO_BASE = 'http://localhost:8000';

const Teachers = () => {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
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
    teacherService.getAll()
      .then((r) => setTeachers(r.data.results || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    showModal('warning', t('teachers.confirmTitle'), t('teachers.confirmDelete'), async () => {
      try {
        await teacherService.delete(id);
        setTeachers(teachers.filter((t) => t.id !== id));
        closeModal();
      } catch (error) {
        showModal('error', t('common.error'), t('teachers.deleteError'));
      }
    });
  };

  const filtered = teachers.filter((t) =>
    search === '' || `${t.first_name} ${t.last_name} ${t.matricule}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('teachers.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('teachers.subtitle')}</p>
          </div>
          <Link
            to="/teachers/new"
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('teachers.add')}</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('teachers.searchPlaceholder')}
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
              <th className="px-6 py-3 font-medium">{t('teachers.photo')}</th>
              <th className="px-6 py-3 font-medium">{t('teachers.matricule')}</th>
              <th className="px-6 py-3 font-medium">{t('teachers.fullName')}</th>
              <th className="px-6 py-3 font-medium">{t('teachers.phone')}</th>
              <th className="px-6 py-3 font-medium">{t('teachers.email')}</th>
              <th className="px-6 py-3 font-medium">{t('teachers.status')}</th>
              <th className="px-6 py-3 font-medium">{t('teachers.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">{t('teachers.notFound')}</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {t.photo ? (
                      <img src={t.photo.startsWith('http') ? t.photo : `${PHOTO_BASE}${t.photo}`} alt={t.first_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                        {t.first_name?.charAt(0)}{t.last_name?.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.matricule}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{t.first_name} {t.last_name}</td>
                  <td className="px-6 py-4 text-gray-600">{t.phone_number}</td>
                  <td className="px-6 py-4 text-gray-600">{t.email || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.is_active ? t('teachers.active') : t('teachers.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Link to={`/teachers/${t.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye className="w-4 h-4" /></Link>
                      <Link to={`/teachers/${t.id}/edit`} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"><Pencil className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(t.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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

export default Teachers;
