import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Eye, FileText, UserPlus, Upload, ArrowLeft, RefreshCw } from 'lucide-react';
import { registrationService, studentService, classService } from '../services/api';
import { getPreferredAcademicYear, getDefaultAcademicYear, fetchAcademicYears } from '../utils/preferences';

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const Registrations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [registrations, setRegistrations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState(() => getPreferredAcademicYear() || '');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('new'); // 'new' | 'rereg'
  const [formError, setFormError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', gender: 'M', date_of_birth: '',
    place_of_birth: '', matricule: '', photo: null,
    parent_full_name: '', parent_phone_number: '', parent_profession: '', parent_quartier: '',
    class_assigned: '', academic_year: getDefaultAcademicYear() || '2024-2025',
    quartier: '', commune: '',
  });

  useEffect(() => {
    fetchData();
    fetchAcademicYears().then(yrs => {
      setYears(yrs);
      if (yrs.length > 0 && !formData.academic_year) {
        setFormData(prev => ({...prev, academic_year: yrs[0].name}));
      }
    });
    const action = searchParams.get('action');
    if (action === 'new') setShowForm(true);
    if (action === 'renew') { setFormMode('renew'); setShowForm(true); }
  }, []);

  const fetchData = async () => {
    try {
      const [regRes, clsRes, stuRes] = await Promise.all([
        registrationService.getAll(),
        classService.getAll(),
        studentService.getAll({ all: true }),
      ]);
      setRegistrations(regRes.data.results || regRes.data || []);
      setClasses(clsRes.data.results || clsRes.data || []);
      setAllStudents(stuRes.data?.results || stuRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleChange = (field, value) => setFormData({ ...formData, [field]: value });

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', gender: 'M', date_of_birth: '',
      place_of_birth: '', matricule: '', photo: null,
      parent_full_name: '', parent_phone_number: '', parent_profession: '', parent_quartier: '',
      class_assigned: '', academic_year: getDefaultAcademicYear() || '2024-2025',
      quartier: '', commune: '',
    });
    setSelectedStudent(null);
    setStudentSearch('');
    setFormError('');
  };

  const openForm = (mode) => {
    setFormMode(mode);
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.class_assigned) {
      setFormError(t('registrations.select_class'));
      return;
    }

    setLoading(true);
    try {
      let studentId;

      if (formMode === 'renew') {
        if (!selectedStudent) {
          setFormError(t('registrations.select_student'));
          setLoading(false);
          return;
        }
        studentId = selectedStudent.id;
      } else {
        const data = new FormData();
        Object.entries(formData).forEach(([k, v]) => {
          if (k === 'photo' && v) data.append(k, v);
          else if (!['photo', 'class_assigned', 'academic_year', 'is_re_registration', 'commune'].includes(k) && v) data.append(k, v);
        });
        const studentRes = await studentService.create(data);
        studentId = studentRes.data.id;
      }

      await registrationService.registerStudent({
        student_id: studentId,
        class_assigned: formData.class_assigned,
        academic_year: formData.academic_year,
        is_re_registration: formMode === 'renew',
      });

      resetForm();
      setShowForm(false);
      fetchData();
    } catch (err) {
      const errData = err.response?.data;
      if (errData) {
        const msgs = Object.values(errData).flat().join(', ');
        setFormError(msgs || t('registrations.error_register'));
      } else {
        setFormError(err.message || t('registrations.error_register'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id) => {
    try { await registrationService.approve(id); fetchData(); }
    catch (e) { console.error(e); }
  };

  const filteredStudents = allStudents.filter((s) => {
    if (!studentSearch) return false;
    const term = studentSearch.toLowerCase();
    return `${s.first_name} ${s.last_name} ${s.matricule}`.toLowerCase().includes(term);
  }).slice(0, 10);

  const filtered = Array.isArray(registrations) ? registrations.filter((r) => {
    const term = search.toLowerCase();
    const matchSearch = search === '' ||
      (r.student_name || '').toLowerCase().includes(term) ||
      (r.student_matricule || '').toLowerCase().includes(term);
    const matchStatus = filterStatus === '' || r.status === filterStatus;
    const matchYear = filterYear === '' || r.academic_year === filterYear;
    const matchClass = filterClass === '' || r.class_name === filterClass;
    return matchSearch && matchStatus && matchYear && matchClass;
  }) : [];

  if (showForm) {
    return (
      <div>
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {formMode === 'renew' ? t('registrations.renew') : t('registrations.new')}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => openForm('new')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formMode === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <UserPlus className="w-4 h-4 inline mr-1" /> {t('registrations.new')}
          </button>
          <button onClick={() => openForm('renew')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${formMode === 'renew' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <RefreshCw className="w-4 h-4 inline mr-1" /> {t('registrations.renew')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>
          )}

          {formMode === 'renew' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.search_student_label')} *</label>
                <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder={t('registrations.search_student_placeholder')} className="w-full border rounded-lg px-4 py-2 text-sm" />
                {studentSearch && filteredStudents.length > 0 && (
                  <div className="mt-1 border rounded-lg max-h-48 overflow-y-auto">
                    {filteredStudents.map((s) => (
                      <div key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(`${s.first_name} ${s.last_name}`); }}
                        className={`px-4 py-2 cursor-pointer text-sm hover:bg-blue-50 flex justify-between items-center ${selectedStudent?.id === s.id ? 'bg-blue-100' : ''}`}>
                        <span>{s.first_name} {s.last_name}</span>
                        <span className="text-gray-400 font-mono">{s.matricule}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedStudent && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg text-sm space-y-1">
                    <div>{t('registrations.selected_student')} <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong></div>
                    <div>{t('registrations.matricule')} <strong>{selectedStudent.matricule}</strong></div>
                    <div>{t('registrations.current_class')} <strong>{selectedStudent.class_assigned_name || t('registrations.unassigned')}</strong></div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.new_class')} *</label>
                  <select required value={formData.class_assigned} onChange={(e) => handleChange('class_assigned', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm">
                    <option value="">{t('registrations.select')}</option>
                    {(classes || []).map((c) => (
                      <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.new_academic_year')}</label>
                  <select value={formData.academic_year} onChange={(e) => handleChange('academic_year', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    {years.map((y) => (
                      <option key={y.id} value={y.name}>{y.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-6 mb-6">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('registrations.photo')}</label>
                  <label className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 overflow-hidden transition-colors">
                    {formData.photo ? (
                      <img src={URL.createObjectURL(formData.photo)} alt={t('registrations.preview')} className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleChange('photo', e.target.files[0])} className="hidden" />
                  </label>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.matricule')}</label>
                    <input type="text" value={formData.matricule} disabled className="w-full border rounded-lg px-4 py-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.date_of_birth')} *</label>
                    <input type="date" required value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.first_name')} *</label>
                  <input type="text" required value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.last_name')} *</label>
                  <input type="text" required value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.gender')} *</label>
                  <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="M">{t('registrations.male')}</option>
                    <option value="F">{t('registrations.female')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.place_of_birth')}</label>
                  <input type="text" value={formData.place_of_birth} onChange={(e) => handleChange('place_of_birth', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.district')}</label>
                  <input type="text" value={formData.quartier} onChange={(e) => handleChange('quartier', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('registrations.parent_guardian')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.parent_full_name')}</label>
                    <input type="text" value={formData.parent_full_name} onChange={(e) => handleChange('parent_full_name', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.parent_phone')}</label>
                    <input type="tel" value={formData.parent_phone_number} onChange={(e) => handleChange('parent_phone_number', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.parent_profession')}</label>
                    <input type="text" value={formData.parent_profession} onChange={(e) => handleChange('parent_profession', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.parent_district')}</label>
                    <input type="text" value={formData.parent_quartier} onChange={(e) => handleChange('parent_quartier', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('registrations.assignment')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.class')} *</label>
                    <select required value={formData.class_assigned} onChange={(e) => handleChange('class_assigned', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm">
                      <option value="">{t('registrations.select')}</option>
                      {(classes || []).map((c) => (
                        <option key={c.id} value={c.id}>{c.display_name || c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('registrations.academic_year')}</label>
                    <select value={formData.academic_year} onChange={(e) => handleChange('academic_year', e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                      {years.map((y) => (
                        <option key={y.id} value={y.name}>{y.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              {t('registrations.cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? t('registrations.registering') : (formMode === 'renew' ? t('registrations.reregister') : t('registrations.register'))}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('registrations.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('registrations.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openForm('renew')} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
              <RefreshCw className="w-4 h-4 shrink-0" /> <span>{t('registrations.renew')}</span>
            </button>
            <button onClick={() => openForm('new')} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <UserPlus className="w-4 h-4 shrink-0" /> <span>{t('registrations.new')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('registrations.search_placeholder')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('registrations.search_placeholder')} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('registrations.class')}</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('results.select')}</option>
              {(classes || []).map((c) => <option key={c.id} value={c.display_name || c.name}>{c.display_name || c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('registrations.status')}</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('results.select')}</option>
              <option value="pending">{t('registrations.status.pending')}</option>
              <option value="approved">{t('registrations.status.approved')}</option>
              <option value="rejected">{t('registrations.status.rejected')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t('results.academic_year')}</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('results.select')}</option>
              {years.map((y) => <option key={y.id} value={y.name}>{y.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            {filtered.length} {filtered.length > 1 ? t('registrations.registrations_plural') : t('registrations.registrations_singular')}
          </div>
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterYear(getPreferredAcademicYear() || ''); setFilterClass(''); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            {t('registrations.reset')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm text-gray-500">
                <th className="px-6 py-3 font-medium">{t('registrations.matricule')}</th>
                <th className="px-6 py-3 font-medium">{t('registrations.student')}</th>
                <th className="px-6 py-3 font-medium">{t('registrations.class')}</th>
                <th className="px-6 py-3 font-medium">{t('registrations.academic_year')}</th>
                <th className="px-6 py-3 font-medium">{t('registrations.status')}</th>
                <th className="px-6 py-3 font-medium">{t('registrations.date')}</th>
                <th className="px-6 py-3 font-medium">{t('registrations.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-gray-500">{t('registrations.no_registrations')}</td></tr>
              ) : (
                filtered.map((reg) => (
                  <tr key={reg.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">{reg.student_matricule}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{reg.student_name}</td>
                    <td className="px-6 py-4 text-gray-600">{reg.class_name}</td>
                    <td className="px-6 py-4 text-gray-600">{reg.academic_year}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[reg.status] || 'bg-gray-100 text-gray-600'}`}>
                        {reg.status === 'pending' ? t('registrations.status.pending') : reg.status === 'approved' ? t('registrations.status.approved') : reg.status === 'rejected' ? t('registrations.status.rejected') : t('registrations.status.cancelled')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(reg.registration_date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {reg.status === 'pending' && (
                          <button onClick={() => handleValidate(reg.id)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200" title={t('registrations.approve')}>
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => navigate(`/students/${reg.student}`)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" title={t('registrations.view_student')}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Registrations;
