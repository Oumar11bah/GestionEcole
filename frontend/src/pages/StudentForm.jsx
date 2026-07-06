import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { X, Upload } from 'lucide-react';
import Label from '../components/Label';
import { studentService, classService, cycleService } from '../services/api';
import MessageModal from '../components/MessageModal';
import { getDefaultAcademicYear, fetchAcademicYears } from '../utils/preferences';

const StudentForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const LYCEE_SPECIALTIES = [
    { value: 'maths', label: t('studentForm.seriesMaths') },
    { value: 'experimental', label: t('studentForm.seriesExperimental') },
    { value: 'sociales', label: t('studentForm.seriesSociales') },
  ];
  const navigate = useNavigate();
  const isEditing = !!id;

  const [classes, setClasses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [fetching, setFetching] = useState(!!id);
  const [loading, setLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('studentForm.confirmLabel') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  const [formData, setFormData] = useState({
    matricule: '',
    first_name: '',
    last_name: '',
    gender: 'M',
    date_of_birth: '',
    place_of_birth: '',
    class_assigned_id: '',
    academic_year: getDefaultAcademicYear() || '2024-2025',
    status: 'active',
    quartier: '',
    parent_id: '',
    parent_full_name: '',
    parent_phone_number: '',
    parent_profession: '',
    parent_quartier: '',
    photo: null,
  });

  useEffect(() => {
    Promise.all([classService.getAll(), cycleService.getAll(), fetchAcademicYears()])
      .then(([c, cy, yrs]) => {
        setClasses(c.data.results || c.data);
        setCycles(cy.data.results || cy.data);
        setAcademicYears(yrs);
        if (yrs.length > 0 && !formData.academic_year) {
          setFormData(prev => ({...prev, academic_year: yrs[0].name}));
        }
      })
      .catch(console.error);

    if (isEditing) {
      studentService.getById(id)
        .then((r) => {
          const s = r.data;
          const photoUrl = s.photo_url ? s.photo_url + '?t=' + new Date().getTime() : null;
          setFormData({
            matricule: s.matricule || '',
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            gender: s.gender || 'M',
            date_of_birth: s.date_of_birth || '',
            place_of_birth: s.place_of_birth || '',
            class_assigned_id: s.class_assigned || '',
            academic_year: s.academic_year || getDefaultAcademicYear() || '2024-2025',
            status: s.status || 'active',
            quartier: s.quartier || '',
            parent_id: s.parent || '',
            parent_full_name: s.parent_details?.full_name || '',
            parent_phone_number: s.parent_details?.phone_number || '',
            parent_profession: s.parent_details?.profession || '',
            parent_quartier: s.parent_details?.quartier || '',
            photo: null,
          });
          if (photoUrl) setPhotoPreview(photoUrl);
          
          if (s.class_assigned && typeof s.class_assigned === 'object' && s.class_assigned.cycle) {
            const cycleName = s.class_assigned.cycle.name || s.class_assigned.cycle;
            setSelectedCycle(cycleName);
            if (cycleName === 'lycee' && s.class_assigned.specialty) {
              setSelectedSpecialty(s.class_assigned.specialty);
            }
          }
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

    const data = new FormData();
    data.append('matricule', formData.matricule);
    data.append('first_name', formData.first_name);
    data.append('last_name', formData.last_name);
    data.append('gender', formData.gender);
    data.append('date_of_birth', formData.date_of_birth);
    data.append('place_of_birth', formData.place_of_birth);
    if (formData.class_assigned_id) data.append('class_assigned_id', formData.class_assigned_id);
    data.append('academic_year', formData.academic_year);
    data.append('status', formData.status);
    data.append('quartier', formData.quartier);
    if (formData.photo) {
      data.append('photo', formData.photo);
    }
    
    // Parent data
    if (formData.parent_full_name) data.append('parent_full_name', formData.parent_full_name);
    if (formData.parent_phone_number) data.append('parent_phone_number', formData.parent_phone_number);
    if (formData.parent_profession) data.append('parent_profession', formData.parent_profession);
    if (formData.parent_quartier) data.append('parent_quartier', formData.parent_quartier);

    try {
      let response;
      if (isEditing) {
        response = await studentService.update(id, data);
      } else {
        response = await studentService.create(data);
      }
      navigate('/students');
    } catch (error) {
      console.error('Failed to save student:', error.response?.data || error.message);
      showModal('error', t('studentForm.errorTitle'), `${t('studentForm.errorPrefix')} ${JSON.stringify(error.response?.data || error.message)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => setFormData({ ...formData, [field]: value });

  const handleCycleChange = (cycle) => {
    setSelectedCycle(cycle);
    setSelectedSpecialty('');
    setFormData({ ...formData, class_assigned_id: '' });
  };

  const handleSpecialtyChange = (specialty) => {
    setSelectedSpecialty(specialty);
    setFormData({ ...formData, class_assigned_id: '' });
  };

  const getFilteredClasses = () => {
    let filtered = classes;
    if (selectedCycle) {
      filtered = filtered.filter((c) => {
        const cycleName = c.cycle?.name || c.cycle;
        return cycleName === selectedCycle;
      });
    }
    if (selectedCycle === 'lycee' && selectedSpecialty) {
      filtered = filtered.filter((c) => c.specialty === selectedSpecialty);
    }
    return filtered;
  };

  if (fetching) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? t('studentForm.editTitle') : t('studentForm.addTitle')}</h1>
        <Link to="/students" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <X className="w-4 h-4" />
          <span>{t('studentForm.cancel')}</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('studentForm.mainInfoTitle')}</h2>
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0">
              <Label>{t('studentForm.photoLabel')}</Label>
              <label className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 overflow-hidden transition-colors">
                {formData.photo ? (
                  <img src={URL.createObjectURL(formData.photo)} alt={t('studentForm.photoPreviewAlt')} className="w-full h-full object-cover" />
                ) : isEditing && photoPreview ? (
                  <img src={photoPreview} alt={t('studentForm.photoAlt')} className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
                <input type="file" accept="image/*" onChange={(e) => handleChange('photo', e.target.files[0])} className="hidden" />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
              <div>
                <Label>{t('studentForm.matriculeLabel')}</Label>
                <input type="text" value={formData.matricule} disabled className="w-full border rounded-lg px-4 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <Label required>{t('studentForm.dobLabel')}</Label>
                <input type="date" required value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label required>{t('studentForm.firstNameLabel')}</Label>
              <input type="text" required value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <Label required>{t('studentForm.lastNameLabel')}</Label>
              <input type="text" required value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('studentForm.genderLabel')}</Label>
              <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="M">{t('studentForm.genderMale')}</option>
                <option value="F">{t('studentForm.genderFemale')}</option>
              </select>
            </div>
            <div>
              <Label>{t('studentForm.birthPlaceLabel')}</Label>
              <input type="text" value={formData.place_of_birth} onChange={(e) => handleChange('place_of_birth', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <Label>{t('studentForm.phoneLabel')}</Label>
              <input type="tel" value={formData.phone_number} onChange={(e) => handleChange('phone_number', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('studentForm.schoolInfoTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>{t('studentForm.cycleLabel')}</Label>
              <select value={selectedCycle} onChange={(e) => handleCycleChange(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">{t('studentForm.selectDefault')}</option>
                {cycles.map((c) => <option key={c.id} value={c.name}>{c.name === 'primaire' ? t('studentForm.cyclePrimaire') : c.name === 'college' ? t('studentForm.cycleCollege') : c.name === 'prescolaire' ? t('studentForm.cyclePrescolaire') : t('studentForm.cycleLycee')}</option>)}
              </select>
            </div>

            {selectedCycle === 'lycee' && (
              <div>
                <Label>{t('studentForm.specialtyLabel')}</Label>
                <select value={selectedSpecialty} onChange={(e) => handleSpecialtyChange(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">{t('studentForm.selectDefault')}</option>
                  {LYCEE_SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}

            <div className={selectedCycle === 'lycee' ? '' : ''}>
              <Label>{t('studentForm.classLabel')}</Label>
              <select value={formData.class_assigned_id} onChange={(e) => handleChange('class_assigned_id', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">{t('studentForm.selectDefault')}</option>
                {getFilteredClasses().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name || c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>{t('studentForm.academicYearLabel')}</Label>
              <select value={formData.academic_year} onChange={(e) => handleChange('academic_year', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                {academicYears.map((y) => (
                  <option key={y.id} value={y.name}>{y.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('studentForm.statusLabel')}</Label>
              <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="active">{t('studentForm.statusActive')}</option>
                <option value="suspended">{t('studentForm.statusSuspended')}</option>
                <option value="expelled">{t('studentForm.statusExpelled')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('studentForm.parentTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label required>{t('studentForm.parentFullNameLabel')}</Label>
              <input type="text" required value={formData.parent_full_name} onChange={(e) => handleChange('parent_full_name', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <Label required>{t('studentForm.parentPhoneLabel')}</Label>
              <input type="tel" required value={formData.parent_phone_number} onChange={(e) => handleChange('parent_phone_number', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('studentForm.parentProfessionLabel')}</Label>
              <input type="text" value={formData.parent_profession} onChange={(e) => handleChange('parent_profession', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <Label>{t('studentForm.parentDistrictLabel')}</Label>
              <input type="text" value={formData.parent_quartier} onChange={(e) => handleChange('parent_quartier', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link to="/students" className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">{t('studentForm.cancel')}</Link>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? t('studentForm.saving') : (isEditing ? t('studentForm.editButton') : t('studentForm.addButton'))}
          </button>
        </div>
      </form>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default StudentForm;
