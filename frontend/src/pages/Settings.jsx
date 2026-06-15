import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User, Lock, Globe, Save, Loader, School, Megaphone, Plus, Trash2, X, Eye, EyeOff, Calendar } from 'lucide-react';
import { authService, schoolService, userService, communicationService, academicYearService, semesterService } from '../services/api';
import { applyThemeColors } from '../utils/theme';
import { getDefaultAcademicYear, fetchAcademicYears as fetchSharedAcademicYears } from '../utils/preferences';
import MessageModal from '../components/MessageModal';

const Settings = () => {
  const { t } = useTranslation();
  const { user, updateUser, canAccess } = useAuth();
  const { changeLanguage } = useLanguage();
  const [searchParams] = useSearchParams();
  const canDeleteYear = user?.profile?.role === 'super_admin' || user?.profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'school');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.profile?.phone_number || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm: '',
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [schoolForm, setSchoolForm] = useState({
    name: '', acronym: '', address: '', phone: '', email: '', website: '',
    director_name: '', academic_year: getDefaultAcademicYear() || '', city: '', country: 'Guinée',
    primary_color: '#1e40af', secondary_color: '#3b82f6',
  });
  const [schoolLogo, setSchoolLogo] = useState(null);
  const [schoolLogoPreview, setSchoolLogoPreview] = useState(null);
  const [schoolSignature, setSchoolSignature] = useState(null);
  const [schoolSignaturePreview, setSchoolSignaturePreview] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [preferencesForm, setPreferencesForm] = useState({
    language: user?.profile?.language || 'fr',
    preferred_academic_year: user?.profile?.preferred_academic_year || '',
  });
  const [academicYears, setAcademicYears] = useState([]);
  const [showAddYear, setShowAddYear] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [semesterForm, setSemesterForm] = useState({ name: '', academic_year: '', start_date: '', end_date: '', is_active: false, order: 0 });
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);

  const showModal = (variant, title, message, onConfirm) => {
    setModal({ open: true, variant, title, message, onConfirm, confirmLabel: onConfirm ? t('settings.confirm') : '' });
  };
  const closeModal = () => {
    setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  };

  useEffect(() => {
    fetchSchoolInfo();
    fetchAcademicYears();
    fetchSemesters();
  }, []);

  const fetchSchoolInfo = async () => {
    try {
      const res = await schoolService.get();
      if (res.data && res.data.id) {
        setSchoolId(res.data.id);
        const primary = res.data.primary_color || '#1e40af';
        const secondary = res.data.secondary_color || '#3b82f6';
        setSchoolForm({
          name: res.data.name || '', acronym: res.data.acronym || '',
          address: res.data.address || '', phone: res.data.phone || '',
          email: res.data.email || '', website: res.data.website || '',
          director_name: res.data.director_name || '',
          academic_year: res.data.academic_year || getDefaultAcademicYear() || '',
          city: res.data.city || '', country: res.data.country || 'Guinée',
          primary_color: primary,
          secondary_color: secondary,
        });
        applyThemeColors(primary, secondary);
        if (res.data.logo_url) setSchoolLogoPreview(res.data.logo_url);
        if (res.data.signature_url) setSchoolSignaturePreview(res.data.signature_url);
      }
    } catch (e) { /* first time, no data yet */ }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await academicYearService.getAll();
      setAcademicYears(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch {}
  };

  const fetchSemesters = async () => {
    try {
      const res = await semesterService.getAll();
      setSemesters(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch {}
  };

  const openSemesterForm = (semester) => {
    if (semester) {
      setSemesterForm({
        name: semester.name,
        academic_year: semester.academic_year,
        start_date: semester.start_date || '',
        end_date: semester.end_date || '',
        is_active: semester.is_active,
        order: semester.order,
      });
      setEditingSemester(semester);
    } else {
      setSemesterForm({ name: '', academic_year: '', start_date: '', end_date: '', is_active: false, order: 0 });
      setEditingSemester(null);
    }
    setShowSemesterModal(true);
  };

  const handleSaveSemester = async (e) => {
    e.preventDefault();
    try {
      if (editingSemester) {
        await semesterService.update(editingSemester.id, semesterForm);
      } else {
        await semesterService.create(semesterForm);
      }
      setShowSemesterModal(false);
      fetchSemesters();
      showModal('success', t('settings.success'), editingSemester ? t('settings.semesterEdited') : t('settings.semesterAdded'));
    } catch (err) {
      const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || t('settings.error');
      showModal('error', t('settings.error'), detail);
    }
  };

  const handleDeleteSemester = async (id) => {
    try {
      await semesterService.delete(id);
      fetchSemesters();
      showModal('success', t('settings.success'), t('settings.semesterDeleted'));
    } catch {
      showModal('error', t('settings.error'), t('settings.semesterDeleteError'));
    }
  };

  const handleAddYear = async () => {
    if (!newYearName.trim()) return;
    try {
      await academicYearService.create({ name: newYearName.trim() });
      setNewYearName('');
      setShowAddYear(false);
      fetchAcademicYears();
      fetchSharedAcademicYears(true);
      showModal('success', t('settings.success'), t('settings.yearAdded', { year: newYearName.trim() }));
    } catch (err) {
      const detail = err.response?.data?.name?.[0] || err.response?.data?.detail || t('settings.yearAddError');
      showModal('error', t('settings.error'), detail);
    }
  };

  const handleDeleteYear = async (id) => {
    try {
      await academicYearService.delete(id);
      fetchAcademicYears();
      fetchSharedAcademicYears(true);
      showModal('success', t('settings.success'), t('settings.yearDeleted'));
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.error || JSON.stringify(err.response?.data) || t('settings.yearDeleteError');
      showModal('error', t('settings.error'), detail);
    }
  };

  const tabs = [
    { id: 'password', label: t('settings.tab.security'), icon: Lock },
    ...(canAccess('settings') ? [
      { id: 'school', label: t('settings.tab.school'), icon: School },
      { id: 'preferences', label: t('settings.tab.preferences'), icon: Globe },
      { id: 'alerts', label: t('settings.tab.alerts'), icon: Megaphone },
    ] : []),
  ];

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('first_name', profileForm.first_name);
      formData.append('last_name', profileForm.last_name);
      formData.append('email', profileForm.email);
      formData.append('phone_number', profileForm.phone_number);
      if (profilePicture) formData.append('profile_picture', profilePicture);
      const res = await authService.updateProfile(user.id, formData);
      const updatedUser = { ...res.data.user, profile: res.data.profile };
      updateUser(updatedUser);
      showModal('success', t('settings.success'), t('settings.profileUpdated'));
    } catch (err) {
      showModal('error', t('settings.error'), err.response?.data?.error || t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm) {
      showModal('error', t('settings.error'), t('settings.passwordMismatch'));
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm,
      });
      showModal('success', t('settings.success'), t('settings.passwordChanged'));
      setPasswordForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      const errData = err.response?.data;
      const errMsg = errData?.error || errData?.current_password?.[0] || errData?.new_password?.[0] || errData?.non_field_errors?.[0] || t('settings.passwordChangeError');
      showModal('error', t('settings.error'), errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authService.updateProfile(user.id, {
        language: preferencesForm.language,
        preferred_academic_year: preferencesForm.preferred_academic_year,
      });
      const updatedUser = { ...res.data.user, profile: res.data.profile };
      updateUser(updatedUser);
      changeLanguage(preferencesForm.language);
      showModal('success', t('settings.success'), t('settings.preferencesSaved'));
    } catch (err) {
      showModal('error', t('settings.error'), t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleSchoolSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(schoolForm).forEach(([k, v]) => formData.append(k, v));
      if (schoolLogo) formData.append('logo', schoolLogo);
      if (schoolSignature) formData.append('director_signature', schoolSignature);
      await schoolService.update(formData);
      applyThemeColors(schoolForm.primary_color, schoolForm.secondary_color);
      showModal('success', t('settings.success'), t('settings.schoolUpdated'));
      setSchoolLogo(null);
      setSchoolSignature(null);
      fetchSchoolInfo();
    } catch (err) {
      showModal('error', t('settings.error'), t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('settings.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSave} className="max-w-2xl space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.password.title')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.password.current')}</label>
                <div className="relative">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.password.new')}</label>
                <div className="relative">
                  <input
                    type={showPw.new ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={4}
                  />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.password.confirm')}</label>
                <div className="relative">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? t('settings.saving') : t('settings.save')}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'school' && (
            <form onSubmit={handleSchoolSave} className="max-w-2xl space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.school.title')}</h3>
              <div className="flex items-center space-x-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.logo')}</label>
                  <label className="relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden">
                    {schoolLogo ? (
                      <img src={URL.createObjectURL(schoolLogo)} className="w-full h-full object-contain" />
                    ) : schoolLogoPreview ? (
                      <img src={schoolLogoPreview} className="w-full h-full object-contain" />
                    ) : (
                      <School className="w-8 h-8 text-gray-400" />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => setSchoolLogo(e.target.files[0])} className="hidden" />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.directorSignature')}</label>
                  <label className="relative w-32 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden">
                    {schoolSignature ? (
                      <img src={URL.createObjectURL(schoolSignature)} className="w-full h-full object-contain" />
                    ) : schoolSignaturePreview ? (
                      <img src={schoolSignaturePreview} className="w-full h-full object-contain" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                    <input type="file" accept="image/*" onChange={(e) => setSchoolSignature(e.target.files[0])} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.name')}</label>
                  <input required value={schoolForm.name} onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.acronym')}</label>
                  <input value={schoolForm.acronym} onChange={(e) => setSchoolForm({...schoolForm, acronym: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.phone')}</label>
                  <input value={schoolForm.phone} onChange={(e) => setSchoolForm({...schoolForm, phone: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.email')}</label>
                  <input type="email" value={schoolForm.email} onChange={(e) => setSchoolForm({...schoolForm, email: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.address')}</label>
                <input value={schoolForm.address} onChange={(e) => setSchoolForm({...schoolForm, address: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.city')}</label>
                  <input value={schoolForm.city} onChange={(e) => setSchoolForm({...schoolForm, city: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.country')}</label>
                  <input value={schoolForm.country} onChange={(e) => setSchoolForm({...schoolForm, country: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.directorName')}</label>
                <input value={schoolForm.director_name} onChange={(e) => setSchoolForm({...schoolForm, director_name: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.academicYear')}</label>
                  <select value={schoolForm.academic_year}
                    onChange={async (e) => {
                      const year = e.target.value;
                      setSchoolForm({...schoolForm, academic_year: year});
                      setPreferencesForm({...preferencesForm, preferred_academic_year: year});
                      try {
                        await schoolService.update({ academic_year: year });
                        await authService.updateProfile(user.id, { preferred_academic_year: year });
                      } catch {}
                    }}
                    className="w-full border rounded-lg px-4 py-2 text-sm">
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.name}>{y.name}{y.is_active ? ` (${t('settings.school.inProgress')})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.website')}</label>
                  <input value={schoolForm.website} onChange={(e) => setSchoolForm({...schoolForm, website: e.target.value})} className="w-full border rounded-lg px-4 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.primaryColor')}</label>
                  <div className="flex items-center space-x-2">
                    <input type="color" value={schoolForm.primary_color} onChange={(e) => { setSchoolForm({...schoolForm, primary_color: e.target.value}); applyThemeColors(e.target.value, schoolForm.secondary_color); }} className="w-10 h-10 rounded border cursor-pointer" />
                    <span className="text-xs text-gray-500">{schoolForm.primary_color}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.school.secondaryColor')}</label>
                  <div className="flex items-center space-x-2">
                    <input type="color" value={schoolForm.secondary_color} onChange={(e) => setSchoolForm({...schoolForm, secondary_color: e.target.value})} className="w-10 h-10 rounded border cursor-pointer" />
                    <span className="text-xs text-gray-500">{schoolForm.secondary_color}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? t('settings.saving') : t('settings.save')}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.notifications.title')}</h3>
              {[
                { label: t('settings.notifications.emailLabel'), desc: t('settings.notifications.emailDesc'), key: 'email' },
                { label: t('settings.notifications.smsLabel'), desc: t('settings.notifications.smsDesc'), key: 'sms' },
                { label: t('settings.notifications.absencesLabel'), desc: t('settings.notifications.absencesDesc'), key: 'absences' },
                { label: t('settings.notifications.paymentsLabel'), desc: t('settings.notifications.paymentsDesc'), key: 'payments' },
                { label: t('settings.notifications.gradesLabel'), desc: t('settings.notifications.gradesDesc'), key: 'grades' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSave} className="max-w-2xl space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.preferences.general')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.preferences.language')}</label>
                <select value={preferencesForm.language}
                  onChange={(e) => setPreferencesForm({ ...preferencesForm, language: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="fr">{t('settings.preferences.french')}</option>
                  <option value="en">{t('settings.preferences.english')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.preferences.academicYear')}</label>
                <div className="flex space-x-2">
                  <input value={preferencesForm.preferred_academic_year}
                    onChange={(e) => setPreferencesForm({ ...preferencesForm, preferred_academic_year: e.target.value })}
                    placeholder={t('settings.preferences.academicYearPlaceholder')}
                    className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowAddYear(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {academicYears.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {academicYears.map((y) => (
                      <span key={y.id} className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        <span>{y.name}{y.is_active ? ` (${t('settings.preferences.inProgress')})` : ''}</span>
                        {canDeleteYear && (
                          <button type="button" onClick={() => showModal('warning', t('settings.confirmTitle'), t('settings.preferences.deleteYearConfirm'), () => handleDeleteYear(y.id))}
                            className="p-0.5 hover:bg-red-200 rounded transition-colors" title={t('settings.preferences.deleteYear')}>
                            <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-gray-900">{t('settings.preferences.semesters')}</h4>
                  <button type="button" onClick={() => openSemesterForm(null)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>{t('settings.preferences.add')}</span>
                  </button>
                </div>
                {semesters.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('settings.preferences.noSemesters')}</p>
                ) : (
                  <div className="space-y-2">
                    {semesters.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">{s.name}</span>
                            <span className="text-xs text-gray-500 ml-2">{s.academic_year_name}</span>
                            {s.is_active && <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">{t('settings.preferences.inProgress')}</span>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button type="button" onClick={() => openSemesterForm(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title={t('settings.preferences.edit')}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button type="button" onClick={() => showModal('warning', t('settings.confirmTitle'), t('settings.preferences.deleteSemesterConfirm', { name: s.name }), () => handleDeleteSemester(s.id))}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title={t('settings.preferences.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? t('settings.saving') : t('settings.save')}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'alerts' && (
            <AlertsTab communicationService={communicationService} />
          )}
        </div>
      </div>
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>

    {showAddYear && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowAddYear(false)}>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowAddYear(false)} className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('settings.academicYear.addTitle')}</h3>
          <input value={newYearName}
            onChange={(e) => setNewYearName(e.target.value)}
            placeholder={t('settings.academicYear.placeholder')}
            className="w-full border rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => setShowAddYear(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{t('settings.academicYear.cancel')}</button>
            <button onClick={handleAddYear} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{t('settings.academicYear.add')}</button>
          </div>
        </div>
      </div>
    )}
    {showSemesterModal && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setShowSemesterModal(false)}>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setShowSemesterModal(false)} className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
          <h3 className="text-lg font-bold text-gray-900 mb-4">{editingSemester ? t('settings.semester.edit') : t('settings.semester.add')}</h3>
          <form onSubmit={handleSaveSemester} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.semester.name')}</label>
              <input required value={semesterForm.name} onChange={(e) => setSemesterForm({...semesterForm, name: e.target.value})}
                placeholder={t('settings.semester.namePlaceholder')}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.semester.academicYear')}</label>
              <select required value={semesterForm.academic_year} onChange={(e) => setSemesterForm({...semesterForm, academic_year: e.target.value})}
                className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('settings.semester.select')}</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.semester.startDate')}</label>
                <input type="date" value={semesterForm.start_date} onChange={(e) => setSemesterForm({...semesterForm, start_date: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.semester.endDate')}</label>
                <input type="date" value={semesterForm.end_date} onChange={(e) => setSemesterForm({...semesterForm, end_date: e.target.value})}
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.semester.order')}</label>
                <input type="number" value={semesterForm.order} onChange={(e) => setSemesterForm({...semesterForm, order: parseInt(e.target.value) || 0})}
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-end pb-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={semesterForm.is_active}
                    onChange={(e) => setSemesterForm({...semesterForm, is_active: e.target.checked})} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm text-gray-700">{t('settings.semester.inProgress')}</span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowSemesterModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{t('settings.semester.cancel')}</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{editingSemester ? t('settings.semester.edit') : t('settings.semester.add')}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

const AlertsTab = ({ communicationService: cs }) => {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, variant: 'info', title: '', message: '' });

  const [form, setForm] = useState({
    title: '',
    message: '',
    target_role: 'all',
    notification_type: 'general',
  });

  const closeAlertModal = () => setAlertModal({ open: false, variant: 'info', title: '', message: '' });

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    closeAlertModal();
    try {
      const res = await cs.sendBulkNotification(form);
      setAlertModal({ open: true, variant: 'success', title: t('settings.alertsTab.success'), message: res.data.status });
      setForm({ title: '', message: '', target_role: 'all', notification_type: 'general' });
    } catch (err) {
      setAlertModal({ open: true, variant: 'error', title: t('settings.alertsTab.error'), message: t('settings.alertsTab.sendError') });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.alertsTab.title')}</h3>
      <p className="text-sm text-gray-500 mb-6">{t('settings.alertsTab.subtitle')}</p>

      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.alertsTab.titleField')}</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
              placeholder={t('settings.alertsTab.titlePlaceholder')} className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.alertsTab.target')}</label>
            <select value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">{t('settings.alertsTab.allUsers')}</option>
              <option value="admin">{t('settings.alertsTab.admins')}</option>
              <option value="comptable">{t('settings.alertsTab.accountants')}</option>
              <option value="directeur">{t('settings.alertsTab.directors')}</option>
              <option value="enseignant">{t('settings.alertsTab.teachers')}</option>
              <option value="surveillant">{t('settings.alertsTab.supervisors')}</option>
              <option value="secretaire">{t('settings.alertsTab.secretaries')}</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.alertsTab.messageField')}</label>
          <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required
            rows="5" placeholder={t('settings.alertsTab.messagePlaceholder')}
            className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-400">{t('settings.alertsTab.type')}</span>
          {[
            { value: 'general', label: t('settings.alertsTab.typeGeneral') },
            { value: 'payment', label: t('settings.alertsTab.typePayment') },
            { value: 'grade', label: t('settings.alertsTab.typeGrade') },
            { value: 'composition', label: t('settings.alertsTab.typeComposition') },
            { value: 'attendance', label: t('settings.alertsTab.typeAttendance') },
          ].map((t) => (
            <label key={t.value} className="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" name="ntype" value={t.value} checked={form.notification_type === t.value}
                onChange={(e) => setForm({ ...form, notification_type: e.target.value })} className="text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-600">{t.label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={sending}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50">
            {sending ? (
              <><Loader className="w-4 h-4 animate-spin" /><span>{t('settings.alertsTab.sending')}</span></>
            ) : (
              <><Megaphone className="w-4 h-4" /><span>{t('settings.alertsTab.send')}</span></>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">{t('settings.alertsTab.examplesTitle')}</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>{t('settings.alertsTab.example1')}</li>
          <li>{t('settings.alertsTab.example2')}</li>
          <li>{t('settings.alertsTab.example3')}</li>
          <li>{t('settings.alertsTab.example4')}</li>
        </ul>
      </div>
      <MessageModal open={alertModal.open} onClose={closeAlertModal} title={alertModal.title} message={alertModal.message} variant={alertModal.variant} />
    </div>
  );
};

export default Settings;
