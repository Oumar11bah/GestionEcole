import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MessageModal from '../components/MessageModal';
import {
  ChevronLeft, ChevronRight, Search, RotateCcw, Clock, User,
  Filter, Trash2,
} from 'lucide-react';

const actionColors = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  view: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  export: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const actionIcons = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  login: '🔐',
  logout: '🚪',
  view: '👁️',
  export: '📤',
};

const actionLabels = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  login: 'Connexion',
  logout: 'Déconnexion',
  view: 'Consultation',
  export: 'Export',
};

const ActivityHistory = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'admin', 'directeur'].includes(user?.profile?.role);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const showModal = (variant, title, message, onConfirm) => setModal({ open: true, variant, title, message, onConfirm, confirmLabel: title });
  const closeModal = () => setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const perPage = 50;

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (search) {
        params.module = search;
        params.action = search;
      }
      const res = await userService.getActivities(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setActivities(data);
        setTotal(data.length < perPage ? (page - 1) * perPage + data.length : page * perPage + 1);
      } else if (data.results) {
        setActivities(data.results);
        setTotal(data.count || data.results.length);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).replace(', ', ' à ');
  };

  const allSelected = activities.length > 0 && activities.every(a => selected.has(a.id));

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activities.map(a => a.id).filter(Boolean)));
    }
  };

  const handleDeleteOne = async (id) => {
    showModal('warning', t('activity.delete', 'Supprimer'), t('activity.confirm_delete_one', 'Supprimer cette activité ?'), async () => {
      setDeleting(true);
      try {
        await userService.deleteActivity(id);
        setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
        await fetchActivities();
        window.dispatchEvent(new CustomEvent('activityDeleted'));
        closeModal();
      } catch (err) {
        console.error('Failed to delete activity:', err);
      } finally {
        setDeleting(false);
      }
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selected].filter(Boolean);
    if (ids.length === 0) return;
    showModal('warning', t('activity.delete_selected', 'Supprimer ({{count}})', { count: ids.length }), t('activity.confirm_delete_bulk', 'Supprimer {{count}} activité(s) ?', { count: ids.length }), async () => {
      setDeleting(true);
      try {
        await userService.bulkDeleteActivities(ids);
        setSelected(new Set());
        await fetchActivities();
        window.dispatchEvent(new CustomEvent('activityDeleted'));
        closeModal();
      } catch (err) {
        console.error('Failed to bulk delete:', err);
      } finally {
        setDeleting(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
            {isAdmin ? t('activity.admin_title', 'Historique des activités') : t('activity.my_history', 'Mon historique')}
          </h1>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('activity.search_placeholder', 'Rechercher par module ou action...')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); setSelected(new Set()); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => { setSearch(''); setPage(1); setSelected(new Set()); }}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {t('activity.reset', 'Réinitialiser')}
        </button>
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t('activity.delete_selected', 'Supprimer ({{count}})', { count: selected.size })}
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('activity.no_activity', 'Aucune activité trouvée.')}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {t('activity.date', 'Date')}
                  </th>
                  {isAdmin && (
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {t('activity.user', 'Utilisateur')}
                      </div>
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" />
                      {t('activity.action', 'Action')}
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {t('activity.module', 'Module')}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {t('activity.description', 'Description')}
                  </th>
                  {isAdmin && (
                    <th className="w-14 px-2 py-3" />
                  )}
                </tr>
              </thead>
              <tbody>
                {activities.map((act, idx) => (
                  <tr key={act.id || idx} className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selected.has(act.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(act.id)}
                        onChange={() => toggleSelect(act.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(act.timestamp)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {act.username || act.user?.username || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${actionColors[act.action] || 'bg-gray-100 text-gray-800'}`}>
                        {actionIcons[act.action] || '•'} {actionLabels[act.action] || act.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {act.module}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {act.description}
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-3">
                        <button
                          onClick={() => handleDeleteOne(act.id)}
                          disabled={deleting}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-40"
                          title={t('activity.delete', 'Supprimer')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {activities.length} {t('activity.entries', 'entrée(s)')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-2">{page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={total > 0 ? page * perPage >= total : activities.length < perPage}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

export default ActivityHistory;