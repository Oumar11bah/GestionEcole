import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Check, X, RotateCcw, Save, AlertTriangle, Plus, Trash2, Edit2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from '../utils/toast';

const MODULES = [
  { key: 'dashboard' },
  { key: 'students' },
  { key: 'teachers' },
  { key: 'registrations' },
  { key: 'classes' },
  { key: 'subjects' },
  { key: 'rooms' },
  { key: 'timetable' },
  { key: 'attendance' },
  { key: 'grades' },
  { key: 'results' },
  { key: 'bulletins' },
  { key: 'payments' },
  { key: 'reports' },
  { key: 'users' },
  { key: 'activity' },
  { key: 'security' },
];

const ROLE_STYLES = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-blue-100 text-blue-700 border-blue-200',
  comptable: 'bg-green-100 text-green-700 border-green-200',
  directeur: 'bg-orange-100 text-orange-700 border-orange-200',
  enseignant: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  surveillant: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  secretaire: 'bg-pink-100 text-pink-700 border-pink-200',
};

const RoleManagement = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const [confirmReset, setConfirmReset] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dirtyRoles, setDirtyRoles] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', permissions: [] });
  const [editingRole, setEditingRole] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounts/roles/');
      const data = res.data.results || res.data || [];
      const initial = data.reduce((acc, r) => {
        acc[r.name] = [...(r.permissions || [])];
        return acc;
      }, {});
      setRoles(data);
      setDirtyRoles(initial);
    } catch {
      toast.error(t('roleManagement.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (roleName, moduleKey) => {
    setDirtyRoles((prev) => {
      const current = [...(prev[roleName] || [])];
      if (current.includes('*')) {
        return { ...prev, [roleName]: [moduleKey] };
      }
      const idx = current.indexOf(moduleKey);
      if (idx >= 0) {
        current.splice(idx, 1);
      } else {
        current.push(moduleKey);
      }
      return { ...prev, [roleName]: current };
    });
  };

  const toggleAll = (roleName) => {
    setDirtyRoles((prev) => {
      const current = prev[roleName] || [];
      if (current.includes('*')) {
        return { ...prev, [roleName]: [] };
      }
      return { ...prev, [roleName]: ['*'] };
    });
  };

  const isModuleEnabled = (roleName, moduleKey) => {
    const perms = dirtyRoles[roleName] || [];
    return perms.includes('*') || perms.includes(moduleKey);
  };

  const hasChanges = (roleName) => {
    const role = roles.find((r) => r.name === roleName);
    if (!role) return false;
    const original = [...(role.permissions || [])].sort();
    const current = [...(dirtyRoles[roleName] || [])].sort();
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  const saveRole = async (roleName) => {
    try {
      setSavingRole(roleName);
      await api.patch(`/accounts/roles/${roleName}/`, { permissions: dirtyRoles[roleName] || [] });
      setRoles((prev) =>
        prev.map((r) =>
          r.name === roleName ? { ...r, permissions: dirtyRoles[roleName] || [] } : r
        )
      );
      toast.success(t('roleManagement.permissionsUpdated'));
    } catch {
      toast.error(t('roleManagement.saveError'));
    } finally {
      setSavingRole(null);
    }
  };

  const resetDefaults = async (roleName) => {
    try {
      await api.post(`/accounts/roles/${roleName}/reset_defaults/`);
      await loadRoles();
      toast.success(t('roleManagement.permissionsReset'));
    } catch {
      toast.error(t('roleManagement.resetError'));
    }
    setConfirmReset(null);
  };

  const createRole = async () => {
    if (!newRole.name.trim() || !newRole.display_name.trim()) {
      toast.error(t('roleManagement.nameAndLabelRequired'));
      return;
    }
    const normalizedName = newRole.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (normalizedName === 'super_admin') {
      toast.error(t('roleManagement.cannotCreateSuperAdmin'));
      return;
    }
    try {
      await api.post('/accounts/roles/', {
        name: normalizedName,
        display_name: newRole.display_name.trim(),
        permissions: newRole.permissions,
      });
      setShowCreateForm(false);
      setNewRole({ name: '', display_name: '', permissions: [] });
      await loadRoles();
      toast.success(t('roleManagement.created'));
    } catch (err) {
      console.error('Create role error:', err);
      const data = err.response?.data;
      const detail = data?.detail || data?.error;
      const fields = data ? Object.values(data).filter(v => typeof v === 'string' || Array.isArray(v)).flat().join(', ') : '';
      toast.error(detail || fields || t('roleManagement.createError'));
    }
  };

  const deleteRole = async (roleName) => {
    try {
      await api.delete(`/accounts/roles/${roleName}/`);
      await loadRoles();
      toast.success(t('roleManagement.deleted'));
    } catch {
      toast.error(t('roleManagement.deleteError'));
    }
    setConfirmDelete(null);
  };

  const startEdit = (role) => {
    setEditingRole(role.name);
    setEditName(role.display_name);
  };

  const saveEdit = async () => {
    if (!editName.trim()) {
      toast.error(t('roleManagement.labelRequired'));
      return;
    }
    try {
      await api.patch(`/accounts/roles/${editingRole}/`, { display_name: editName.trim() });
      setRoles((prev) =>
        prev.map((r) => (r.name === editingRole ? { ...r, display_name: editName.trim() } : r))
      );
      toast.success(t('roleManagement.edited'));
    } catch {
      toast.error(t('roleManagement.editError'));
    }
    setEditingRole(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setEditName('');
  };

  const isSuperAdmin = currentUser?.profile?.role === 'super_admin';
  const visibleRoles = isSuperAdmin
    ? roles
    : roles.filter(r => r.name !== 'super_admin' && !(r.name === 'secretaire' && r.is_system));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('roleManagement.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('roleManagement.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>{t('roleManagement.newRole')}</span>
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('roleManagement.createRoleTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('roleManagement.technicalName')}</label>
              <input
                type="text"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder={t('roleManagement.technicalNamePlaceholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('roleManagement.displayName')}</label>
              <input
                type="text"
                value={newRole.display_name}
                onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                placeholder={t('roleManagement.displayNamePlaceholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('roleManagement.initialPermissions')}</label>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((mod) => (
                <label
                  key={mod.key}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm ${
                    newRole.permissions.includes(mod.key)
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newRole.permissions.includes(mod.key)}
                    onChange={() => {
                      setNewRole((prev) => ({
                        ...prev,
                        permissions: prev.permissions.includes(mod.key)
                          ? prev.permissions.filter((k) => k !== mod.key)
                          : [...prev.permissions, mod.key],
                      }));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t(`roleManagement.module.${mod.key}`)}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={createRole} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">{t('roleManagement.create')}</button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">{t('roleManagement.cancel')}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleRoles.map((role) => (
          <div key={role.name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[role.name] || 'bg-gray-100 text-gray-700'}`}>
                  {editingRole === role.name ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border border-gray-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                        autoFocus
                      />
                      <button onClick={saveEdit} className="p-0.5 text-green-600 hover:bg-green-50 rounded" title={t('roleManagement.save')}><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={cancelEdit} className="p-0.5 text-gray-400 hover:bg-gray-100 rounded" title={t('roleManagement.cancel')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    role.display_name
                  )}
                </span>
                <span className="text-xs text-gray-400">
                  {t('roleManagement.userCount', { count: role.user_count || 0 })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => startEdit(role)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title={t('roleManagement.edit')}><Edit2 className="w-4 h-4" /></button>
                {confirmDelete === role.name ? (
                  <div className="flex items-center space-x-1">
                    <button onClick={() => deleteRole(role.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title={t('roleManagement.confirm')}><Check className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDelete(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title={t('roleManagement.cancel')}><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(role.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title={t('roleManagement.delete')}><Trash2 className="w-4 h-4" /></button>
                )}
                {hasChanges(role.name) && (
                  <>
                    <button
                      onClick={() => saveRole(role.name)}
                      disabled={savingRole === role.name}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingRole === role.name ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{t('roleManagement.save')}</span>
                    </button>
                    {confirmReset === role.name ? (
                      <div className="flex items-center space-x-1">
                        <button onClick={() => resetDefaults(role.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title={t('roleManagement.confirm')}><Check className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmReset(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title={t('roleManagement.cancel')}><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmReset(role.name)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title={t('roleManagement.reset')}><RotateCcw className="w-4 h-4" /></button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase">{t('roleManagement.modules')}</span>
                <button onClick={() => toggleAll(role.name)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  {dirtyRoles[role.name]?.includes('*') ? t('roleManagement.deselectAll') : t('roleManagement.selectAll')}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MODULES.map((mod) => (
                  <label
                    key={mod.key}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      isModuleEnabled(role.name, mod.key)
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    } ${role.name === 'super_admin' && !isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isModuleEnabled(role.name, mod.key)}
                      onChange={() => toggleModule(role.name, mod.key)}
                      disabled={role.name === 'super_admin' && !isSuperAdmin}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{t(`roleManagement.module.${mod.key}`)}</span>
                  </label>
                ))}
              </div>
              {role.permissions?.includes('*') && !dirtyRoles[role.name]?.includes('*') && (
                <div className="flex items-center space-x-1.5 mt-2 text-xs text-orange-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t('roleManagement.limitedAccessWarning')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleManagement;
