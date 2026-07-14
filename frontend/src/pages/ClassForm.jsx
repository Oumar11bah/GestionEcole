import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import Label from '../components/Label';
import { classService, teacherService } from '../services/api';
import MessageModal from '../components/MessageModal';
import { getDefaultAcademicYear, fetchAcademicYears } from '../utils/preferences';

const CYCLE_CLASSES = {
  primaire: ['1ère Année', '2eme Année', '3eme Année', '4eme Année', '5eme Année', '6eme Année'],
  college: ['7eme Année', '8eme Année', '9eme Année', '10eme Année'],
  lycee: ['11eme Année', '12eme Année', 'Terminale'],
  prescolaire: ['Petit section', 'Grand section']
};

const ClassForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const SERIES = [
    { value: 'maths', label: t('classForm.seriesMaths') },
    { value: 'experimental', label: t('classForm.seriesExperimental') },
    { value: 'sociales', label: t('classForm.seriesSociales') },
  ];

  const [formData, setFormData] = useState({
    name: '',
    cycle_name: 'primaire',
    specialty: 'none',
    academic_year: getDefaultAcademicYear() || '2024-2025',
    class_teacher: '',
  });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const [academicYears, setAcademicYears] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('classForm.confirmLabel') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    fetchAcademicYears().then(yrs => {
      setAcademicYears(yrs);
      if (!isEditing && yrs.length > 0 && !formData.academic_year) {
        setFormData(prev => ({...prev, academic_year: yrs[0].name}));
      }
    });
    teacherService.getAll().then((res) => {
      setTeachers(res.data.results || res.data || []);
    }).catch(() => {});
    if (isEditing) fetchClass();
  }, [id]);

  const fetchClass = async () => {
    try {
      const response = await classService.getById(id);
      setFormData({
        name: response.data.name,
        cycle_name: response.data.cycle?.name || response.data.cycle_name || 'primaire',
        specialty: response.data.specialty || 'none',
        academic_year: response.data.academic_year || getDefaultAcademicYear() || '2024-2025',
        class_teacher: response.data.class_teacher || '',
      });
    } catch (error) {
      console.error('Failed to fetch class:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.cycle_name === 'lycee' && !formData.specialty) {
      showModal('error', t('classForm.errorTitle'), t('classForm.validationSeries'));
      return;
    }

    const submitData = {
      ...formData,
      specialty: formData.cycle_name === 'lycee' ? formData.specialty : 'none',
      class_teacher: formData.class_teacher || null,
    };

    setLoading(true);
    try {
      if (isEditing) {
        await classService.update(id, submitData);
      } else {
        await classService.create(submitData);
      }
      navigate('/classes');
    } catch (error) {
      console.error('Failed to save class:', error.response?.data || error.message);
      const errorData = error.response?.data;
      if (errorData) {
        const errorStr = JSON.stringify(errorData);
        if (errorStr.includes('UNIQUE') || errorStr.includes('unique') || errorStr.includes('deja')) {
          showModal('error', t('classForm.errorTitle'), t('classForm.errorUniqueName'));
        } else if (errorData.detail) {
          showModal('error', t('classForm.errorTitle'), errorData.detail);
        } else if (errorData.name) {
          showModal('error', t('classForm.errorTitle'), `${t('classForm.errorNamePrefix')} ${errorData.name}`);
        } else {
          showModal('error', t('classForm.errorTitle'), `${t('classForm.errorPrefix')} ${JSON.stringify(errorData)}`);
        }
      } else {
        showModal('error', t('classForm.errorTitle'), `${t('classForm.errorPrefix')} ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCycleChange = (value) => {
    const defaultName = CYCLE_CLASSES[value]?.[0] || '';
    setFormData({
      ...formData,
      cycle_name: value,
      name: defaultName,
      specialty: value === 'lycee' ? '' : 'none',
    });
  };

  const showSeries = formData.cycle_name === 'lycee';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? t('classForm.editTitle') : t('classForm.addTitle')}</h1>
        <Link to="/classes" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <X className="w-4 h-4" />
          <span>{t('classForm.cancel')}</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">

        <div className="mb-6">
          <Label required>{t('classForm.nameLabel')}</Label>
          <select
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">{t('classForm.selectDefault')}</option>
            {CYCLE_CLASSES[formData.cycle_name]?.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className={`gap-6 mb-6 ${showSeries ? 'grid grid-cols-3' : 'grid grid-cols-2'}`}>
          <div>
            <Label>{t('classForm.cycleLabel')}</Label>
            <select
              value={formData.cycle_name}
              onChange={(e) => handleCycleChange(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="primaire">{t('classForm.cyclePrimaire')}</option>
              <option value="college">{t('classForm.cycleCollege')}</option>
              <option value="lycee">{t('classForm.cycleLycee')}</option>
              <option value="prescolaire">{t('classForm.cyclePrescolaire')}</option>
            </select>
          </div>

          {showSeries && (
            <div>
              <Label>{t('classForm.seriesLabel')}</Label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('classForm.selectDefault')}</option>
                {SERIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label required>{t('classForm.academicYearLabel')}</Label>
            <select
              required
              value={formData.academic_year}
              onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {academicYears.map((y) => (
                <option key={y.id} value={y.name}>{y.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <Label>{t('classForm.classTeacher')}</Label>
          <select
            value={formData.class_teacher}
            onChange={(e) => setFormData({...formData, class_teacher: e.target.value})}
            className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('classForm.selectDefault')}</option>
            {teachers.filter(t => t.is_active).map((t) => (
              <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
          <Link to="/classes" className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            {t('classForm.cancel')}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t('classForm.saving') : (isEditing ? t('classForm.editButton') : t('classForm.addButton'))}
          </button>
        </div>
      </form>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default ClassForm;
