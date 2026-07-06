import React, { useState, useEffect } from 'react';
import { tenantService } from '../services/api';
import { Search, Building, Calendar, AlertTriangle, RefreshCw, Save, X } from 'lucide-react';
import toast from '../utils/toast';

const LicenseManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await tenantService.getAll();
      setTenants(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (tenant) => {
    setEditId(tenant.id);
    setEditForm({
      license_start: tenant.license_start || '',
      license_end: tenant.license_end || '',
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const saveLicense = async (id) => {
    try {
      await tenantService.update(id, editForm);
      toast.success('Licence mise à jour');
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    }
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-lg px-6 py-6 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gestion des licences</h1>
            <p className="text-purple-100 text-sm mt-0.5">Définir les dates d'expiration et les limites des établissements</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher un établissement..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={load} className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition flex items-center space-x-1.5">
          <RefreshCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucun établissement trouvé</p>
          </div>
        ) : filtered.map((tenant) => {
          const isExpired = tenant.license_end && new Date(tenant.license_end) < new Date();
          return (
            <div key={tenant.id} className="bg-white rounded-xl border shadow-sm">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                      <Building className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                      <p className="text-xs text-gray-500">{tenant.subdomain}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    tenant.is_pending ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    tenant.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {tenant.is_pending ? 'En attente' : tenant.is_active ? 'Actif' : 'Désactivé'}
                  </span>
                </div>

                {editId === tenant.id ? (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date de début</label>
                        <input type="date" value={editForm.license_start} onChange={(e) => setEditForm({ ...editForm, license_start: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin</label>
                        <input type="date" value={editForm.license_end} onChange={(e) => setEditForm({ ...editForm, license_end: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500" />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-100 transition flex items-center space-x-1">
                        <X className="w-4 h-4" /><span>Annuler</span>
                      </button>
                      <button onClick={() => saveLicense(tenant.id)} className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center space-x-1">
                        <Save className="w-4 h-4" /><span>Enregistrer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Licence</span>
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {isExpired ? 'Expirée' : 'Valide'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Du : </span>
                        <span className="font-medium">{tenant.license_start || 'N/D'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Au : </span>
                        <span className="font-medium">{tenant.license_end || 'N/D'}</span>
                      </div>
                    </div>
                    <button onClick={() => startEdit(tenant)} className="mt-3 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
                      Modifier la licence
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LicenseManagement;