import React, { useEffect, useState } from 'react';
import Label from '../components/Label';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Eye, EyeOff, Pencil, Trash2, Key, Shield, ShieldOff, X, Check, AlertTriangle } from 'lucide-react';
import { userService, roleService, authService, tenantService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from '../utils/toast';

const BADGE_PALETTE = [
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-teal-100 text-teal-700 border-teal-200',
];

const initialFormState = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  role: '',
  phone_number: '',
  address: '',
  gender: '',
  date_of_birth: '',
  date_of_hire: '',
  is_active: true,
  password: '',
  tenant_id: '',
};

const UserManagement = () => {
  const { t } = useTranslation();
  const { user: currentUser, canAccess } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetPwUser, setResetPwUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const canManage = canAccess('users');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [tenantsList, setTenantsList] = useState([]);
  const isSuperAdmin = currentUser?.profile?.role === 'super_admin';

  const roleMap = {};
  rolesList.forEach((r, i) => {
    roleMap[r.name] = {
      label: r.display_name,
      badge: BADGE_PALETTE[i % BADGE_PALETTE.length],
    };
  });

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchOnlineUsers();
    fetchRoles();
    if (isSuperAdmin) fetchTenants();
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll();
      setUsers(res.data.results || res.data);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await userService.getStats();
      setStats(res.data);
    } catch (e) {}
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await userService.getOnline();
      setOnlineUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  };

  const fetchRoles = async () => {
    try {
      const res = await roleService.getAll();
      setRolesList(res.data.results || res.data || []);
    } catch (e) {}
  };

  const fetchTenants = async () => {
    try {
      const res = await tenantService.getAll();
      setTenantsList(res.data.results || res.data || []);
    } catch (e) {}
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchSearch = !term || `${u.username} ${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(term);
    const matchRole = !filterRole || u.profile?.role === filterRole;
    const matchStatus = filterStatus === '' || (filterStatus === 'active' && u.is_active) || (filterStatus === 'inactive' && !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setSubmitting(true);
    try {
      if (editUser) {
        const payload = {};
        Object.keys(form).forEach((k) => {
          if (form[k] !== '' && k !== 'password') payload[k] = form[k];
        });
        await userService.update(editUser.id, payload);
        toast.success(t('users.updated'));
      } else {
        const res = await userService.create(form);
        setGeneratedPassword(res.data.generated_password);
        toast.success(t('users.created'));
      }
      closeModal();
      fetchUsers();
      fetchStats();
    } catch (e) {
      const err = e.response?.data?.error || e.response?.data?.username?.[0] || t('users.saveError');
      toast.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ ...initialFormState, role: rolesList[0]?.name || '', tenant_id: tenantsList[0]?.id || '' });
    setGeneratedPassword(null);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      username: u.username,
      email: u.email || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      role: u.profile?.role || rolesList[0]?.name || '',
      phone_number: u.profile?.phone_number || '',
      address: u.profile?.address || '',
      gender: u.profile?.gender || '',
      date_of_birth: u.profile?.date_of_birth || '',
      date_of_hire: u.profile?.date_of_hire || '',
      is_active: u.is_active,
      password: '',
    });
    setGeneratedPassword(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditUser(null);
    setGeneratedPassword(null);
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    try {
      await userService.delete(id);
      toast.success(t('users.deleted'));
      setDeleteConfirm(null);
      fetchUsers();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.error || t('users.deleteError'));
    }
  };

  const handleResetPassword = async (id) => {
    if (!canManage) return;
    try {
      const res = await userService.resetPassword(id);
      setNewPassword(res.data.new_password);
      setShowPasswordModal(true);
      setResetPwUser(null);
    } catch (e) {
      toast.error(t('users.resetError'));
    }
  };

  const handleToggleActive = async (u) => {
    if (!canManage) return;
    try {
      await userService.update(u.id, { is_active: !u.is_active });
      if (!u.is_active) {
        try { await authService.unblockUser(u.id); } catch (e) {}
      }
      toast.success(u.is_active ? t('users.accountDeactivated') : t('users.accountActivated'));
      fetchUsers();
      fetchStats();
    } catch (e) {
      toast.error(t('users.modifyError'));
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatLastLogin = (d) => {
    if (!d) return t('users.never');
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return d;
    }
  };

  const getInitials = (u) => {
    if (u.first_name && u.last_name) return `${u.first_name.charAt(0)}${u.last_name.charAt(0)}`.toUpperCase();
    return (u.username?.charAt(0) || '?').toUpperCase();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('users.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('users.subtitle')}</p>
          </div>
          {canManage && (
            <button onClick={openCreate} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:scale-95">
              <UserPlus className="w-4 h-4" />
              <span className="text-sm font-medium">{t('users.new')}</span>
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('users.total')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('users.active')}</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('users.inactive')}</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{stats.inactive}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('users.roles')}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{rolesList.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('users.online')}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{onlineUsers.length}</p>
          </div>
        </div>
      )}

      {onlineUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t('users.onlineUsers')}</p>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.map((u) => (
              <div key={u.id} className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-medium">{u.full_name}</span>
                <span className="text-emerald-500 text-xs">({u.role_display})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('users.searchPlaceholder')} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('users.allRoles')}</option>
              {rolesList.map((r) => <option key={r.name} value={r.name}>{r.display_name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">{t('users.allStatuses')}</option>
              <option value="active">{t('users.activeLabel')}</option>
              <option value="inactive">{t('users.inactiveLabel')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50/50">
                <th className="px-6 py-3 font-medium">{t('users.photo')}</th>
                <th className="px-6 py-3 font-medium">{t('users.username')}</th>
                <th className="px-6 py-3 font-medium">{t('users.fullName')}</th>
                <th className="px-6 py-3 font-medium">{t('users.email')}</th>
                <th className="px-6 py-3 font-medium">{t('users.phone')}</th>
                <th className="px-6 py-3 font-medium">{t('users.role')}</th>
                <th className="px-6 py-3 font-medium">{t('users.status')}</th>
                <th className="px-6 py-3 font-medium">{t('users.lastLogin')}</th>
                <th className="px-6 py-3 font-medium text-right">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500">{t('users.noUsers')}</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    {u.profile?.profile_picture ? (
                      <img src={u.profile.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-gray-200" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(u)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-gray-900">{u.username}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-gray-700">{u.first_name} {u.last_name}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-gray-500">{u.email || '—'}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-gray-500">{u.profile?.phone_number || '—'}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${roleMap[u.profile?.role]?.badge || 'bg-gray-100 text-gray-600'}`}>
                      {roleMap[u.profile?.role]?.label || u.profile?.role || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{u.is_active ? t('users.activeLabel') : t('users.inactiveLabel')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatLastLogin(u.last_login)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => setShowDetail(u)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t('users.view')}>
                        <Eye className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <>
                          <button onClick={() => openEdit(u)} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title={t('users.edit')}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleActive(u)} className={`p-2 rounded-lg transition-colors ${u.is_active ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={u.is_active ? t('users.deactivate') : t('users.activate')}>
                            {u.is_active ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setResetPwUser(u)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title={t('users.resetPassword')}>
                            <Key className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(u)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('users.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{t('users.userCount', { count: filteredUsers.length })}</span>
          {canManage && (
            <button onClick={openCreate} className="flex items-center space-x-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
              <UserPlus className="w-4 h-4" />
              <span>{t('users.new')}</span>
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editUser ? t('users.editTitle') : t('users.newTitle')}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label required>{t('users.usernameRequired')}</Label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('users.usernamePlaceholder')} />
                </div>
                {!editUser && (
                  <div>
                    <Label>{t('users.password')}</Label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('users.passwordPlaceholder')} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <Label>{t('users.firstName')}</Label>
                  <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('users.firstName')} />
                </div>
                <div>
                  <Label>{t('users.lastName')}</Label>
                  <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('users.lastName')} />
                </div>
                <div>
                  <Label>{t('users.roleRequired')}</Label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {rolesList.map((r) => <option key={r.name} value={r.name}>{r.display_name}</option>)}
                  </select>
                </div>
                {isSuperAdmin && !editUser && (
                  <div>
                    <Label required>Établissement</Label>
                    <select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Sélectionner un établissement</option>
                      {tenantsList.map((t) => <option key={t.id} value={t.id}>{t.name || t.subdomain}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <Label>{t('users.phone')}</Label>
                  <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('users.phonePlaceholder')} />
                </div>
                <div>
                  <Label>{t('users.gender')}</Label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">{t('users.genderUnspecified')}</option>
                    <option value="M">{t('users.male')}</option>
                    <option value="F">{t('users.female')}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('users.dateOfBirth')}</Label>
                  <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <Label>{t('users.address')}</Label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows="2" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('users.address')} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">{t('users.activeAccount')}</span>
                </label>
              </div>

              {generatedPassword && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800">{t('users.createdSuccess')}</p>
                      <p className="text-sm text-green-700 mt-1">{t('users.generatedPassword')} <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{generatedPassword}</strong></p>
                      <p className="text-xs text-green-600 mt-1">{t('users.communicatePassword')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{t('users.cancel')}</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                  {submitting ? t('users.saving') : editUser ? t('users.edit') : t('users.createUser')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{t('users.passwordReset')}</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800 mb-2">{t('users.newPasswordLabel')}</p>
              <p className="text-lg font-mono font-bold text-purple-900 bg-purple-100 px-3 py-2 rounded text-center">{newPassword}</p>
              <p className="text-xs text-purple-600 mt-2">{t('users.communicatePassword')}</p>
            </div>
            <button onClick={() => setShowPasswordModal(false)} className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">{t('users.close')}</button>
          </div>
        </div>
      )}

      {resetPwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setResetPwUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{t('users.resetPasswordConfirmTitle')}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">{t('users.resetPasswordConfirmMessage', { firstName: resetPwUser.first_name, lastName: resetPwUser.last_name })}</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setResetPwUser(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{t('users.cancel')}</button>
              <button onClick={() => { handleResetPassword(resetPwUser.id); setResetPwUser(null); }} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors">{t('users.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{t('users.deleteTitle')}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">{t('users.deleteConfirmMessage', { firstName: deleteConfirm.first_name, lastName: deleteConfirm.last_name, username: deleteConfirm.username })}</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">{t('users.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">{t('users.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">{t('users.detailsTitle')}</h2>
              <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex items-center space-x-4 mb-6">
              {showDetail.profile?.profile_picture ? (
                <img src={showDetail.profile.profile_picture} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold">{getInitials(showDetail)}</div>
              )}
              <div>
                <p className="text-lg font-bold text-gray-900">{showDetail.first_name} {showDetail.last_name}</p>
                <p className="text-sm text-gray-500">@{showDetail.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">{t('users.email')}</span><p className="font-medium text-gray-900">{showDetail.email || '—'}</p></div>
              <div><span className="text-gray-500">{t('users.phone')}</span><p className="font-medium text-gray-900">{showDetail.profile?.phone_number || '—'}</p></div>
              <div><span className="text-gray-500">{t('users.role')}</span><p className="font-medium text-gray-900">{roleMap[showDetail.profile?.role]?.label || showDetail.profile?.role || '—'}</p></div>
              <div><span className="text-gray-500">{t('users.status')}</span><p className={`font-medium ${showDetail.is_active ? 'text-green-600' : 'text-red-600'}`}>{showDetail.is_active ? t('users.activeLabel') : t('users.inactiveLabel')}</p></div>
              <div><span className="text-gray-500">{t('users.registrationDate')}</span><p className="font-medium text-gray-900">{formatDate(showDetail.date_joined)}</p></div>
              <div><span className="text-gray-500">{t('users.lastLogin')}</span><p className="font-medium text-gray-900">{formatLastLogin(showDetail.last_login)}</p></div>
            </div>
            {showDetail.profile?.address && (
              <div className="mt-4 text-sm"><span className="text-gray-500">{t('users.address')}</span><p className="font-medium text-gray-900">{showDetail.profile.address}</p></div>
            )}
            <button onClick={() => setShowDetail(null)} className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">{t('users.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
