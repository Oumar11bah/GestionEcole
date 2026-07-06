import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantService } from '../services/api';
import {
  Search, Check, X, ChevronDown, ChevronUp,
  Building, Mail, Phone, Users, UserCheck, AlertTriangle,
  RefreshCw, ToggleLeft, ToggleRight, Plus, Shield, User, Key, Eye, EyeOff
} from 'lucide-react';

const CreateTenantModal = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '', subdomain: '', contact_email: '', contact_phone: '',
    admin_username: '', admin_password: '', admin_email: '',
    admin_first_name: '', admin_last_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: '', subdomain: '', contact_email: '', contact_phone: '', admin_username: '', admin_password: '', admin_email: '', admin_first_name: '', admin_last_name: '' });
      setError('');
      setShowPassword(false);
    }
  }, [open]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await tenantService.create(form);
      onCreated();
      onClose();
      setForm({ name: '', subdomain: '', contact_email: '', contact_phone: '', admin_username: '', admin_password: '', admin_email: '', admin_first_name: '', admin_last_name: '' });
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === 'object' && detail !== null) {
        const msgs = Object.values(detail).flat().filter(Boolean);
        setError(msgs.length ? msgs.join('. ') : JSON.stringify(detail));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError(`Erreur ${err.response?.status || ''} lors de la création`);
      }
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nouvel établissement</h2>
              <p className="text-xs text-gray-500">Créez un nouveau client et son administrateur</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gray-50/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
              <Building className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">Établissement</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sous-domaine <span className="text-red-500">*</span></label>
                <input type="text" name="subdomain" value={form.subdomain} onChange={handleChange} required
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" name="contact_email" value={form.contact_email} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <input type="tel" name="contact_phone" value={form.contact_phone} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
              <Shield className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">Administrateur de l'établissement</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom d'utilisateur <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" name="admin_username" value={form.admin_username} onChange={handleChange} required autoComplete="off"
                    className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} name="admin_password" value={form.admin_password} onChange={handleChange} required minLength={6} autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                <input type="text" name="admin_first_name" value={form.admin_first_name} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                <input type="text" name="admin_last_name" value={form.admin_last_name} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email admin</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" name="admin_email" value={form.admin_email} onChange={handleChange}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-sm">
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span>Créer l'établissement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditTenantModal = ({ open, tenant, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    name: '', contact_email: '', contact_phone: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && tenant) {
      setForm({
        name: tenant.name || '',
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        notes: tenant.notes || '',
      });
      setError('');
    }
  }, [open, tenant]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await tenantService.update(tenant.id, form);
      onUpdated();
      onClose();
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === 'object' && detail !== null) {
        const msgs = Object.values(detail).flat().filter(Boolean);
        setError(msgs.length ? msgs.join('. ') : JSON.stringify(detail));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError(`Erreur ${err.response?.status || ''} lors de la modification`);
      }
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Modifier l'établissement</h2>
              <p className="text-xs text-gray-500">{tenant?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-gray-50/80 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de contact</label>
                <input type="email" name="contact_email" value={form.contact_email} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <input type="tel" name="contact_phone" value={form.contact_phone} onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition" />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shadow-sm">
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantCard = ({ tenant, onToggle, onApprove, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [license, setLicense] = useState(null);

  const loadLicense = async () => {
    try {
      const { data } = await tenantService.checkLicense(tenant.id);
      setLicense(data);
    } catch { }
  };

  useEffect(() => { if (expanded) loadLicense(); }, [expanded]);

  const statusBadge = tenant.is_pending
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : tenant.is_active
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : 'bg-red-100 text-red-800 border-red-300';

  const statusText = tenant.is_pending
    ? 'En attente'
    : tenant.is_active
      ? 'Actif'
      : 'Désactivé';

  return (
    <div className="bg-white rounded-xl border shadow-sm hover:shadow-md transition">
      <div className="p-5" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
              <p className="text-sm text-gray-500">{tenant.subdomain}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusBadge}`}>
              {statusText}
            </span>
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{tenant.contact_email || '\u2014'}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{tenant.contact_phone || '\u2014'}</span>
            </div>
          </div>

          {license && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Licence</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  license.is_expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {license.is_expired ? 'Expirée' : 'Valide'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Du : </span>
                  <span className="font-medium">{license.license_start || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Au : </span>
                  <span className="font-medium">{license.license_end || 'N/D'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {tenant.is_pending && (
              <button onClick={() => onApprove(tenant.id)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
                <Check className="w-4 h-4" />
                <span>Approuver</span>
              </button>
            )}
            <button onClick={() => onEdit(tenant)}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <span>Modifier</span>
            </button>
            <button onClick={() => onToggle(tenant.id)}
              className={`flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition ${
                tenant.is_active
                  ? 'text-red-600 border-red-200 hover:bg-red-50'
                  : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
              }`}>
              {tenant.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
              <span>{tenant.is_active ? 'Désactiver' : 'Activer'}</span>
            </button>
            <button onClick={() => onDelete(tenant)}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span>Supprimer</span>
            </button>
            <button onClick={loadLicense}
              className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              <RefreshCw className="w-4 h-4" />
              <span>Rafraîchir</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TenantManagement = () => {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await tenantService.getAll();
      setTenants(data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id) => {
    try {
      await tenantService.toggleActivation(id);
      load();
    } catch { }
  };

  const handleApprove = async (id) => {
    try {
      await tenantService.approve(id);
      load();
    } catch { }
  };

  const handleEdit = (tenant) => {
    setEditTenant(tenant);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await tenantService.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      load();
    } catch { }
  };

  const filtered = tenants.filter(t => {
    if (filter === 'active') return t.is_active && !t.is_pending;
    if (filter === 'pending') return t.is_pending;
    if (filter === 'inactive') return !t.is_active && !t.is_pending;
    return true;
  }).filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.is_active && !t.is_pending).length,
    pending: tenants.filter(t => t.is_pending).length,
    inactive: tenants.filter(t => !t.is_active && !t.is_pending).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CreateTenantModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
      <EditTenantModal open={!!editTenant} tenant={editTenant} onClose={() => setEditTenant(null)} onUpdated={load} />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Confirmer la suppression</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer <strong>{deleteConfirm.name}</strong> ({deleteConfirm.subdomain}) ?
              Toutes les données associées seront définitivement perdues.
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={handleDeleteConfirm}
                className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des clients</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" />
          <span>Nouvel établissement</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
          <p className="text-sm text-gray-500">Actifs</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-sm text-gray-500">En attente</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          <p className="text-sm text-gray-500">Inactifs</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Rechercher un client..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white">
          <option value="all">Tous</option>
          <option value="active">Actifs</option>
          <option value="pending">En attente</option>
          <option value="inactive">Inactifs</option>
        </select>
        <button onClick={load}
          className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition flex items-center space-x-1.5">
          <RefreshCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucun client trouvé</p>
          </div>
        ) : (
          filtered.map(t => (
            <TenantCard key={t.id} tenant={t} onToggle={handleToggle} onApprove={handleApprove} onEdit={handleEdit} onDelete={(tenant) => setDeleteConfirm(tenant)} />
          ))
        )}
      </div>
    </div>
  );
};

export default TenantManagement;