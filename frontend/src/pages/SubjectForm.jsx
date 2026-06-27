import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { subjectService, cycleService } from '../services/api';
import MessageModal from '../components/MessageModal';

const SubjectForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    coefficient: 1,
    description: '',
    cycle: [],
  });
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('common.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    cycleService.getAll()
      .then((r) => setCycles(r.data.results || r.data))
      .catch(() => showModal('error', t('common.error'), t('subjectForm.loadError')));

    if (isEditing) {
      subjectService.getById(id)
        .then((r) => {
          const d = r.data;
          setFormData({
            name: d.name,
            code: d.code,
            coefficient: d.coefficient || 1,
            description: d.description || '',
            cycle: Array.isArray(d.cycle) ? d.cycle : [],
          });
        })
        .catch(console.error)
        .finally(() => setFetching(false));
    } else {
      setFetching(false);
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.cycle.length === 0) {
      showModal('error', t('common.error'), t('subjectForm.selectCycle'));
      setLoading(false);
      return;
    }

    const data = {
      ...formData,
      description: formData.description || '',
    };

    try {
      if (isEditing) {
        await subjectService.update(id, data);
      } else {
        await subjectService.create(data);
      }
      navigate('/subjects');
    } catch (error) {
      console.error('Failed to save subject:', error.response?.data || error.message);
      showModal('error', t('common.error'), `${t('common.errorLabel')} ${JSON.stringify(error.response?.data || error.message)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCycleToggle = (cycleId) => {
    const current = formData.cycle;
    if (current.includes(cycleId)) {
      setFormData({ ...formData, cycle: current.filter((id) => id !== cycleId) });
    } else {
      setFormData({ ...formData, cycle: [...current, cycleId] });
    }
  };

  if (fetching) return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? t('subjectForm.editTitle') : t('subjectForm.addTitle')}</h1>
        <Link to="/subjects" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <X className="w-4 h-4" />
          <span>{t('common.cancel')}</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('subjectForm.name')}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('subjectForm.code')}</label>
            <input
              type="text"
              required
              placeholder={t('subjectForm.codePlaceholder')}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('subjectForm.coefficient')}</label>
            <input
              type="number"
              min="1"
              required
              value={formData.coefficient}
              onChange={(e) => setFormData({ ...formData, coefficient: parseInt(e.target.value) || 1 })}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('subjectForm.cycles')}</label>
          {cycles.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t('subjectDetail.noCycles')}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {cycles.map((cycle) => (
                <label key={cycle.id} className={`flex items-center space-x-2 border rounded-lg px-4 py-2 cursor-pointer transition-colors ${
                  formData.cycle.includes(cycle.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.cycle.includes(cycle.id)}
                    onChange={() => handleCycleToggle(cycle.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">
                    {cycle.name === 'primaire' ? t('subjectForm.primaire') : cycle.name === 'college' ? t('subjectForm.college') : t('subjectForm.lycee')}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('subjectForm.description')}</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
          <Link to="/subjects" className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            {t('common.cancel')}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t('common.saving') : (isEditing ? t('common.edit') : t('common.add'))}
          </button>
        </div>
      </form>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default SubjectForm;
