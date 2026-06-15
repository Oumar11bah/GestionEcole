import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { X, Upload } from 'lucide-react';
import { teacherService, classService, subjectService, teacherSubjectService } from '../services/api';
import MessageModal from '../components/MessageModal';

const PHOTO_BASE = 'http://localhost:8000';

const TeacherForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  let teacherId = id;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [fetching, setFetching] = useState(!!id);
  const [loading, setLoading] = useState(false);
  const [existingPhoto, setExistingPhoto] = useState(null);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('common.confirm') : '' });
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
    phone_number: '',
    email: '',
    address: '',
    photo: null,
    specialty: '',
    diploma: '',
    years_of_experience: 0,
    contract_type: 'full_time',
    salary: '',
    is_active: true,
    selected_classes: [],
    selected_subjects: [],
  });

  useEffect(() => {
    Promise.all([
      classService.getAll(),
      subjectService.getAll(),
    ]).then(([c, s]) => {
      setClasses(c.data.results || c.data);
      setSubjects(s.data.results || s.data);
    }).catch(console.error);

    if (isEditing) {
      Promise.all([
        teacherService.getById(id),
        teacherSubjectService.getAll({ teacher_id: id }),
      ]).then(([teacherRes, subjectsRes]) => {
          const t = teacherRes.data;
          const assignments = subjectsRes.data.results || subjectsRes.data;
          setExistingPhoto(t.photo || null);
          setFormData({
            matricule: t.matricule || '',
            first_name: t.first_name || '',
            last_name: t.last_name || '',
            gender: t.gender || 'M',
            date_of_birth: t.date_of_birth || '',
            phone_number: t.phone_number || '',
            email: t.email || '',
            address: t.address || '',
            photo: null,
            specialty: t.specialty || '',
            diploma: t.diploma || '',
            years_of_experience: t.years_of_experience || 0,
            contract_type: t.contract_type || 'full_time',
            salary: t.salary || '',
            is_active: t.is_active ?? true,
            selected_classes: [...new Set(assignments.map((a) => a.class_assigned_id || a.class_assigned))],
            selected_subjects: [...new Set(assignments.map((a) => a.subject_id || a.subject))],
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

    const data = new FormData();
    data.append('first_name', formData.first_name);
    data.append('last_name', formData.last_name);
    data.append('gender', formData.gender);
    data.append('date_of_birth', formData.date_of_birth);
    data.append('phone_number', formData.phone_number);
    if (formData.email) data.append('email', formData.email);
    if (formData.address) data.append('address', formData.address);
    if (formData.photo) data.append('photo', formData.photo);
    if (formData.specialty) data.append('specialty', formData.specialty);
    if (formData.diploma) data.append('diploma', formData.diploma);
    data.append('years_of_experience', formData.years_of_experience);
    data.append('contract_type', formData.contract_type);
    if (formData.salary) data.append('salary', formData.salary);
    data.append('is_active', formData.is_active);

    try {
      if (isEditing) {
        await teacherService.update(teacherId, data);
      } else {
        const res = await teacherService.create(data);
        teacherId = res.data.id;
      }

      const existing = await teacherSubjectService.getAll({ teacher_id: teacherId });
      const existingIds = (existing.data.results || existing.data).map((t) => t.id);
      for (const eid of existingIds) {
        await teacherSubjectService.delete(eid);
      }
      for (const classId of formData.selected_classes) {
        for (const subjectId of formData.selected_subjects) {
          await teacherSubjectService.create({
            teacher_id: teacherId,
            subject_id: subjectId,
            class_assigned_id: classId,
          });
        }
      }

      navigate('/teachers');
    } catch (error) {
      console.error('Failed to save teacher:', error.response?.data || error.message);
      showModal('error', t('common.error'), `${t('common.errorLabel')} ${JSON.stringify(error.response?.data)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => setFormData({ ...formData, [field]: value });
  const toggleArrayItem = (field, value) => {
    const arr = formData[field];
    if (arr.includes(value)) {
      setFormData({ ...formData, [field]: arr.filter((v) => v !== value) });
    } else {
      setFormData({ ...formData, [field]: [...arr, value] });
    }
  };

  if (fetching) return <div className="flex items-center justify-center h-64">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? t('teacherForm.editTitle') : t('teacherForm.addTitle')}</h1>
        <Link to="/teachers" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <X className="w-4 h-4" />
          <span>{t('common.cancel')}</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('teacherForm.personalInfo')}</h2>
          <div className="flex gap-6 mb-6">
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('teacherForm.photo')}</label>
              <label className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 overflow-hidden transition-colors">
                {formData.photo ? (
                  <img src={URL.createObjectURL(formData.photo)} alt={t('teacherForm.preview')} className="w-full h-full object-cover" />
                ) : existingPhoto ? (
                  <img src={existingPhoto.startsWith('http') ? existingPhoto : `${PHOTO_BASE}${existingPhoto}`} alt={t('teacherForm.photo')} className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
                <input type="file" accept="image/*" onChange={(e) => handleChange('photo', e.target.files[0])} className="hidden" />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 content-start">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.matricule')}</label>
                <input type="text" disabled value={formData.matricule} className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.dateOfBirth')}</label>
                <input type="date" required value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.gender')}</label>
                <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                  <option value="M">{t('teacherForm.male')}</option>
                  <option value="F">{t('teacherForm.female')}</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.firstName')}</label>
              <input type="text" required value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.lastName')}</label>
              <input type="text" required value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.phone')}</label>
              <input type="tel" required value={formData.phone_number} onChange={(e) => handleChange('phone_number', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.email')}</label>
              <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.address')}</label>
              <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('teacherForm.professionalInfo')}</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.specialty')}</label>
              <input type="text" value={formData.specialty} onChange={(e) => handleChange('specialty', e.target.value)} placeholder={t('teacherForm.specialtyPlaceholder')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.diploma')}</label>
              <input type="text" value={formData.diploma} onChange={(e) => handleChange('diploma', e.target.value)} placeholder={t('teacherForm.diplomaPlaceholder')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.yearsOfExperience')}</label>
              <input type="number" min="0" value={formData.years_of_experience} onChange={(e) => handleChange('years_of_experience', parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.contractType')}</label>
              <select value={formData.contract_type} onChange={(e) => handleChange('contract_type', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                <option value="full_time">{t('teacherForm.fullTime')}</option>
                <option value="part_time">{t('teacherForm.partTime')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.salary')}</label>
              <input type="number" min="0" value={formData.salary} onChange={(e) => handleChange('salary', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('teacherForm.status')}</label>
              <select value={formData.is_active} onChange={(e) => handleChange('is_active', e.target.value === 'true')} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors">
                <option value="true">{t('teacherForm.active')}</option>
                <option value="false">{t('teacherForm.inactive')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('teacherForm.taughtClasses')}</h2>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <button key={c.id} type="button" onClick={() => toggleArrayItem('selected_classes', c.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${formData.selected_classes.includes(c.id) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                {c.display_name || c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('teacherForm.taughtSubjects')}</h2>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s.id} type="button" onClick={() => toggleArrayItem('selected_subjects', s.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${formData.selected_subjects.includes(s.id) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                {s.name} ({s.code})
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Link to="/teachers" className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium">{t('common.cancel')}</Link>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium">{loading ? t('common.saving') : (isEditing ? t('common.edit') : t('common.add'))}</button>
        </div>
      </form>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default TeacherForm;
