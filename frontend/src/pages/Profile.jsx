import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, MapPin, Calendar, Shield, Key, Save, Camera } from 'lucide-react';
import { userService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from '../utils/toast';

const GENDER_LABELS = { M: 'Masculin', F: 'Féminin' };
const ROLE_LABELS = {
  super_admin: 'Super Admin', admin: 'Admin', comptable: 'Comptable',
  directeur: 'Directeur', enseignant: 'Enseignant', surveillant: 'Surveillant',
  secretaire: 'Secrétaire',
};

const Profile = () => {
  const { t } = useTranslation();
  const { user: authUser, updateUser } = useAuth();
  const { changeLanguage } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    address: '', gender: '', date_of_birth: '', language: '',
  });
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await userService.getMyProfile();
      const u = res.data;
      setProfile(u);
      setForm({
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || '',
        phone_number: u.profile?.phone_number || '',
        address: u.profile?.address || '',
        gender: u.profile?.gender || '',
        date_of_birth: u.profile?.date_of_birth || '',
        language: u.profile?.language || '',
      });
    } catch {
      toast.error(t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '') fd.append(k, v);
      });
      if (pictureFile) fd.append('profile_picture', pictureFile);
      const res = await userService.updateMyProfile(fd);
      setProfile(res.data);
      updateUser({ ...authUser, ...res.data });
      if (form.language) changeLanguage(form.language);
      setPictureFile(null);
      setPicturePreview(null);
      toast.success(t('profile.updated'));
    } catch (e) {
      toast.error(e.response?.data?.error || t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast.error(t('profile.passwordLength'));
      return;
    }
    setPwSaving(true);
    try {
      await authService.changePassword(pwForm);
      toast.success(t('profile.passwordChanged'));
      setShowPwForm(false);
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) {
      toast.error(e.response?.data?.error || t('profile.passwordChangeError'));
    } finally {
      setPwSaving(false);
    }
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name)
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    return (profile?.username?.charAt(0) || '?').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-5">
          <div className="relative">
            {picturePreview || profile?.profile?.profile_picture ? (
              <div className="relative">
                <img src={picturePreview || profile?.profile?.profile_picture} alt=""
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) { setPictureFile(f); setPicturePreview(URL.createObjectURL(f)); } }} />
                </label>
              </div>
            ) : (
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold">
                  {getInitials()}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) { setPictureFile(f); setPicturePreview(URL.createObjectURL(f)); } }} />
                </label>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile?.first_name} {profile?.last_name}</h1>
            <p className="text-sm text-gray-500">@{profile?.username}</p>
            <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200">
              {t(`profile.role.${profile?.profile?.role}`, profile?.profile?.role)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>{t('profile.personalInfo')}</span>
          </h2>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.firstName')}</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.lastName')}</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.email')}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.phone')}</label>
              <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.gender')}</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('profile.genderUnspecified')}</option>
                <option value="M">{t('profile.male')}</option>
                <option value="F">{t('profile.female')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.dateOfBirth')}</label>
              <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.preferredLanguage')}</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{t('profile.default')}</option>
                <option value="fr">{t('profile.french')}</option>
                <option value="en">{t('profile.english')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.address')}</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows="2"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" />
              <span>{saving ? t('profile.saving') : t('profile.save')}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
            <Key className="w-5 h-5 text-purple-600" />
            <span>{t('profile.password')}</span>
          </h2>
          <button onClick={() => setShowPwForm(!showPwForm)}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors">
            {showPwForm ? t('profile.cancel') : t('profile.changePassword')}
          </button>
        </div>
        {showPwForm && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.currentPassword')}</label>
                <input type="password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.newPassword')}</label>
                <input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.confirm')}</label>
                <input type="password" value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={pwSaving}
                className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50">
                <Key className="w-4 h-4" />
                <span>{pwSaving ? t('profile.saving') : t('profile.changePassword')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
