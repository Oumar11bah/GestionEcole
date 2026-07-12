import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, TrendingUp, Award, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { dashboardService, userService, expenseService } from '../services/api';
import { Trash2, Building, CheckCircle, Clock, XCircle, ArrowRight, Globe } from 'lucide-react';
import MessageModal from '../components/MessageModal';
import toast from '../utils/toast';

const pieColors = ['#3B82F6', '#10B981', '#F59E0B'];

const MODEL_LABELS = {
  Student: 'Élève', Teacher: 'Enseignant', Grade: 'Note', Class: 'Classe',
  Subject: 'Matière', Room: 'Salle', Payment: 'Paiement', User: 'Utilisateur',
  Registration: 'Inscription', Attendance: 'Présence', Result: 'Résultat',
  Bulletin: 'Bulletin',
};

const Dashboard = () => {
  const { user, canAccess } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_payments: 0,
    total_expenses: 0,
    total_classes: 0,
    success_rate: 0,
    enrollment_trend: [],
    cycle_distribution: [],
    recent_activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });
  const showModal = (variant, title, message, onConfirm) => setModal({ open: true, variant, title, message, onConfirm, confirmLabel: title });
  const closeModal = () => setModal({ open: false, variant: 'info', title: '', message: '', onConfirm: null, confirmLabel: '' });

  const handleClearActivities = () => {
    showModal('warning', t('activity.delete', 'Supprimer'), t('dashboard.confirmClearActivities', 'Vider toutes les activités enregistrées ?'), async () => {
      try {
        await userService.clearActivities();
        closeModal();
        fetchStats();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Erreur lors du vidage');
      }
    });
  };

  const fetchStats = useCallback(() => {
    dashboardService.getStats()
      .then((r) => setStats(prev => ({ ...prev, ...r.data })))
      .catch(() => {})
      .finally(() => setLoading(false));
    expenseService.getSummary()
      .then((r) => setStats(prev => ({ ...prev, total_expenses: r.data.total || 0 })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
    window.addEventListener('activityDeleted', fetchStats);
    return () => window.removeEventListener('activityDeleted', fetchStats);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (stats.is_super_admin) {
    return (
      <div>
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg px-6 py-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Tableau de bord superviseur</h1>
              <p className="text-blue-100 text-sm mt-0.5">Vue d'ensemble de tous les établissements</p>
            </div>
            <Globe className="w-10 h-10 text-blue-300" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total établissements</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_tenants}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Actifs</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active_tenants}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">En attente</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending_tenants}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-l-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Désactivés</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.inactive_tenants}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {stats.recent_tenants && stats.recent_tenants.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Derniers établissements inscrits</h3>
              <Link to="/tenants" className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                <span>Voir tout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recent_tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.subdomain}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    tenant.is_pending ? 'bg-amber-100 text-amber-700' :
                    tenant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {tenant.is_pending ? 'En attente' : tenant.is_active ? 'Actif' : 'Désactivé'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-600 px-6 py-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.welcome')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label={t('dashboard.students')} value={stats.total_students} delta="" color="blue" />
        <StatCard icon={GraduationCap} label={t('dashboard.teachers')} value={stats.total_teachers} delta="" color="green" />
        {canAccess('payments') && <StatCard icon={TrendingUp} label={t('dashboard.payments')} value={`${stats.total_payments.toLocaleString()} GNF`} delta="" color="green" />}
        <StatCard icon={TrendingDown} label={t('dashboard.expenses')} value={`${stats.total_expenses.toLocaleString()} GNF`} delta="" color="red" />
        <StatCard icon={Award} label={t('dashboard.successRate')} value={`${stats.success_rate}%`} delta="" color="orange" />
      </div>

      {stats.enrollment_trend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.enrollmentTrend')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.enrollment_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="primaire" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name={t('dashboard.primary')} />
                <Line type="monotone" dataKey="college" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name={t('dashboard.middleSchool')} />
                <Line type="monotone" dataKey="lycee" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} name={t('dashboard.highSchool')} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {stats.cycle_distribution.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.cycleDistribution')}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.cycle_distribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {stats.cycle_distribution.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center text-sm text-gray-500 mt-2">{t('dashboard.totalStudents', { count: stats.total_students })}</p>
            </div>
          )}
        </div>
      )}

      {stats.recent_activities.length > 0 ? (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentActivities')}</h3>
            <button onClick={handleClearActivities} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('dashboard.clearActivities', 'Vider')}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">{t('dashboard.activity')}</th>
                  {(user?.profile?.role === 'admin' || user?.profile?.role === 'directeur') && (
                    <th className="pb-3 font-medium">{t('dashboard.user')}</th>
                  )}
                  <th className="pb-3 font-medium">{t('dashboard.description')}</th>
                  <th className="pb-3 font-medium">{t('dashboard.date')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {stats.recent_activities.map((act) => (
                  <tr key={act.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        act.action === 'create' ? 'bg-green-100 text-green-700' :
                        act.action === 'update' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {act.action === 'create' ? t('dashboard.actionCreate') : act.action === 'update' ? t('dashboard.actionUpdate') : act.action === 'delete' ? t('dashboard.actionDelete') : act.action}
                      </span>
                    </td>
                    {(user?.profile?.role === 'admin' || user?.profile?.role === 'directeur') && (
                      <td className="py-3 text-gray-600">{act.user}</td>
                    )}
                    <td className="py-3 text-gray-600">{MODEL_LABELS[act.model_name] || act.model_name} - {act.object_repr}</td>
                    <td className="py-3 text-gray-500">{new Date(act.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(', ', ' à ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <p className="text-gray-500">{t('dashboard.noActivity')}</p>
        </div>
      )}
      <MessageModal open={modal.open} onClose={closeModal} title={modal.title} message={modal.message} variant={modal.variant} confirmLabel={modal.confirmLabel} onConfirm={modal.onConfirm} />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, delta, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {delta && <p className="text-xs text-green-600 mt-1">{delta}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;