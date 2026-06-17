import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { communicationService, userService } from '../services/api';
import AccessDeniedModal from './AccessDeniedModal';
import MessageModal from './MessageModal';
import {
  LayoutDashboard, Users, Building, GraduationCap, BookOpen,
  ClipboardList, CalendarClock, CreditCard, BarChart3,
  Settings, LogOut, Bell, Search, ChevronDown, UserPlus, DoorOpen, FileText, Menu, X, User, Shield, Clock,
  Sun, Moon
} from 'lucide-react';

const logoUrl = new URL('../assets/LOG.png', import.meta.url).href;

const menuItems = [
  { icon: LayoutDashboard, label: 'nav.dashboard', path: '/dashboard', module: 'dashboard' },
  { icon: Users, label: 'nav.students', path: '/students', module: 'students' },
  { icon: UserPlus, label: 'nav.registrations', path: '/registrations', module: 'registrations' },
  { icon: Building, label: 'nav.classes', path: '/classes', module: 'classes' },
  { icon: GraduationCap, label: 'nav.teachers', path: '/teachers', module: 'teachers' },
  { icon: BookOpen, label: 'nav.subjects', path: '/subjects', module: 'subjects' },
  { icon: DoorOpen, label: 'nav.rooms', path: '/rooms', module: 'rooms' },
  { icon: ClipboardList, label: 'nav.grades', path: '/grades', module: 'grades' },
  { icon: CalendarClock, label: 'nav.attendance', path: '/attendance', module: 'attendance' },
  { icon: CalendarClock, label: 'nav.timetable', path: '/timetable', module: 'timetable' },
  { icon: CreditCard, label: 'nav.payments', path: '/payments', module: 'payments' },
  { icon: BarChart3, label: 'nav.results', path: '/results', module: 'results' },
  { icon: FileText, label: 'nav.bulletins', path: '/bulletins', module: 'bulletins' },
  { icon: BarChart3, label: 'nav.reports', path: '/reports', module: 'reports' },
  { icon: Clock, label: 'nav.activity', path: '/activity', module: 'users' },
  { icon: Settings, label: 'nav.settings', path: '/settings', module: 'settings' },
  { icon: Users, label: 'nav.users', path: '/users', module: 'users' },
  { icon: Shield, label: 'nav.permissions', path: '/roles', module: 'users' },
];

const Sidebar = ({ open, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, canAccess } = useAuth();
  const [deniedModule, setDeniedModule] = useState(null);
  const [deniedLabel, setDeniedLabel] = useState('');
  const [logoutModal, setLogoutModal] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const fetch = () => userService.getOnline().then(r => setOnlineCount(r.data?.length || 0)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    setLogoutModal(true);
  };

  const handleNav = (item) => {
    onClose();
    if (canAccess(item.module)) {
      navigate(item.path);
    } else {
      setDeniedLabel(item.label);
      setDeniedModule(item.path);
    }
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <div className={`fixed top-0 left-0 h-full w-64 text-white flex flex-col z-50 transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:fixed`} style={{ background: `linear-gradient(to bottom, var(--sidebar-from), var(--sidebar-to))` }}>
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center space-x-3">
            <img src={logoUrl} alt="EcolePro GN" className="w-10 h-10 lg:w-12 lg:h-12 object-contain" />
            <div>
              <h1 className="text-base lg:text-lg font-bold">EcolePro GN</h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Système de Gestion</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-white/10 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const hasAccess = canAccess(item.module);
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item)}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors ${
                  isActive
                    ? 'border-r-4'
                    : hasAccess
                      ? 'hover:bg-black/20'
                      : ''
                } ${!hasAccess ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={isActive ? { backgroundColor: 'rgba(255,255,255,0.1)', borderRightColor: 'var(--primary-ring)' } : {}}
                title={!hasAccess ? t('access.denied') : t(item.label)}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : ''}`} />
                <span className="text-sm truncate">{t(item.label)}</span>
                {item.path === '/users' && onlineCount > 0 && (
                  <span className="ml-auto flex items-center space-x-1 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{onlineCount}</span>
                  </span>
                )}
                {!hasAccess && (
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>{t('access.blocked')}</span>
                )}
              </button>
            );
          })}
        </nav>

          <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center space-x-3 px-4 pb-3 mb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="relative">
                {user?.profile?.profile_picture ? (
                  <img src={user.profile.profile_picture} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                    {user?.first_name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white/30 rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Connecté en tant que</p>
                <p className="text-sm font-medium text-white truncate">
                  {user?.profile?.role ? ({
                    super_admin: 'Super Admin',
                    admin: 'Admin',
                    comptable: 'Comptable',
                    directeur: 'Directeur',
                    enseignant: 'Enseignant',
                    surveillant: 'Surveillant',
                    secretaire: 'Secrétaire',
                  })[user.profile.role] : 'Utilisateur'}
                </p>
              </div>
            </div>
            <Link to="/profile" onClick={onClose} className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-white/10 rounded-lg transition-colors">
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">{t('nav.profile')}</span>
            </Link>
          <button onClick={handleLogout} className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">{t('nav.logout')}</span>
          </button>
        </div>
      </div>
      <AccessDeniedModal open={!!deniedModule} onClose={() => setDeniedModule(null)} label={deniedLabel} />
      <MessageModal
        open={logoutModal}
        variant="warning"
        title={t('nav.logout')}
        message={t('confirm.logout')}
        onConfirm={() => { logout(); navigate('/login'); }}
        confirmLabel={t('nav.logout')}
        onClose={() => setLogoutModal(false)}
      />
    </>
  );
};

const Navbar = ({ onMenuToggle }) => {
  const { t } = useTranslation();
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifList, setNotifList] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const notifRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifs = async () => {
      try {
        const [countRes, listRes] = await Promise.all([
          communicationService.getUnreadCount(user.id),
          communicationService.getAllNotifications({ recipient_id: user.id, ordering: '-created_at' }),
        ]);
        setUnreadCount(countRes.data.count);
        setNotifList((listRes.data.results || listRes.data).slice(0, 5));
      } catch {}
    };
    fetchNotifs();
    const notifInterval = setInterval(fetchNotifs, 10000);
    const heartInterval = setInterval(() => {
      userService.heartbeat().catch(() => {});
    }, 120000);
    return () => {
      clearInterval(notifInterval);
      clearInterval(heartInterval);
    };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allFeatures = [
    ...menuItems,
    { label: 'search.financialReport', path: '/reports?type=payments', module: 'reports' },
    { label: 'search.studentStats', path: '/reports?type=students', module: 'reports' },
    { label: 'search.absenceReport', path: '/reports?type=attendance', module: 'reports' },
    { label: 'search.academicResults', path: '/reports?type=grades', module: 'reports' },
    { label: 'search.activityHistory', path: '/reports?type=activity', module: 'reports' },
    { label: 'search.printList', path: '/students', module: 'students' },
    { label: 'search.printCard', path: '/students', module: 'students' },
    { label: 'search.addStudent', path: '/students/new', module: 'students' },
    { label: 'search.newRegistration', path: '/registrations?action=new', module: 'registrations' },
    { label: 'search.renewRegistration', path: '/registrations?action=renew', module: 'registrations' },
    { label: 'search.addClass', path: '/classes/new', module: 'classes' },
    { label: 'search.addTeacher', path: '/teachers/new', module: 'teachers' },
    { label: 'search.addSubject', path: '/subjects/new', module: 'subjects' },
    { label: 'search.addRoom', path: '/rooms?action=add', module: 'rooms' },
    { label: 'search.addUser', path: '/users', module: 'users' },
    { label: 'nav.timetable', path: '/timetable', module: 'timetable' },
    { label: 'search.addLesson', path: '/timetable?action=add', module: 'timetable' },
    { label: 'search.markAttendance', path: '/attendance?action=mark', module: 'attendance' },
    { label: 'search.recordPayment', path: '/payments?action=new', module: 'payments' },
    { label: 'search.printReceipt', path: '/payments', module: 'payments' },
    { label: 'nav.bulletins', path: '/bulletins', module: 'bulletins' },
    { label: 'search.downloadAll', path: '/bulletins', module: 'bulletins' },
    { label: 'search.exportPdf', path: '/reports', module: 'reports' },
    { label: 'search.importGrades', path: '/grades?action=import', module: 'grades' },
    { label: 'search.exportExcel', path: '/grades', module: 'grades' },
    { label: 'search.changePassword', path: '/settings?tab=password', module: 'settings' },
    { label: 'settings.school', path: '/settings?tab=school', module: 'settings' },
    { label: 'settings.alerts', path: '/settings?tab=alerts', module: 'settings' },
    { label: 'settings.preferences', path: '/settings?tab=preferences', module: 'settings' },
    { label: 'search.academicYear', path: '/settings?tab=school', module: 'settings' },
    { label: 'search.averages', path: '/averages', module: 'grades' },
    { label: 'nav.permissions', path: '/roles', module: 'users' },
  ];

  const searchResults = searchQuery.trim()
    ? allFeatures
        .filter((item, i, self) =>
          t(item.label).toLowerCase().includes(searchQuery.toLowerCase()) &&
          self.findIndex((x) => x.label === item.label) === i
        )
        .filter((item) => item.module ? canAccess(item.module) : true)
        .slice(0, 8)
    : [];

  const handleMarkAsRead = async (id) => {
    try {
      await communicationService.markAsRead(id);
      setNotifList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await communicationService.markAllRead(user.id);
      setNotifList((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDeleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await communicationService.deleteNotification(id);
      setNotifList((prev) => prev.filter((n) => n.id !== id));
      if (unreadCount > 0) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(notifList.map((n) => communicationService.deleteNotification(n.id)));
      setNotifList([]);
      setUnreadCount(0);
    } catch {}
  };

  const handleLogout = () => {
    setLogoutModal(true);
  };

  const notifTypeIcon = (type) => {
    switch (type) {
      case 'payment': return '💰';
      case 'attendance': return '⚠️';
      case 'grade': return '📝';
      case 'login': return '🔓';
      case 'logout': return '🔒';
      default: return '📢';
    }
  };

  return (
    <>
    <div className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white shadow-sm flex items-center justify-between px-3 lg:px-6 z-40">
      <div className="flex items-center space-x-3">
        <button onClick={onMenuToggle} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="hidden sm:block relative w-48 lg:w-72" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && searchResults.length > 0) { navigate(searchResults[0].path); setSearchQuery(''); e.target.blur(); } }}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border overflow-hidden z-50">
              {searchResults.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setSearchQuery(''); }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors"
                >
                  {item.icon ? <item.icon className="w-4 h-4 text-gray-500" /> : <Search className="w-4 h-4 text-gray-500" />}
                  <span>{t(item.label)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 lg:space-x-4">
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          {darkMode ? <Sun className="w-5 h-5 text-gray-600" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>

        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-72 lg:w-80 bg-white rounded-lg shadow-lg border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">Tout marquer lu</button>}
                  {notifList.length > 0 && <button onClick={handleClearAll} className="text-xs text-red-500 hover:underline">Tout effacer</button>}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifList.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">Aucune notification</div>
                ) : (
                  notifList.map((n) => (
                    <div key={n.id} className={`relative px-4 py-3 border-b hover:bg-gray-50 cursor-pointer group ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                      onClick={() => { setShowNotifs(false); setSelectedNotif(n); }}>
                      <div className="flex items-start space-x-2">
                        <span className="text-base">{notifTypeIcon(n.notification_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate pr-6`}>{n.title}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                        <button onClick={(e) => handleDeleteNotif(n.id, e)} className="absolute right-2 top-2 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setShowProfile(!showProfile)} className="flex items-center space-x-2 lg:space-x-3 hover:bg-gray-100 rounded-lg p-1.5 lg:p-2 transition-colors">
            <div className="relative">
              {user?.profile?.profile_picture ? (
                <img src={user.profile.profile_picture} alt="" className="w-7 h-7 lg:w-8 lg:h-8 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'var(--primary)' }}>
                  {user?.first_name?.charAt(0) || 'A'}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-gray-500">
                {user?.profile?.role ? ({
                  super_admin: 'Super Admin',
                  admin: 'Administrateur',
                  comptable: 'Comptable',
                  directeur: 'Directeur',
                  enseignant: 'Enseignant',
                  surveillant: 'Surveillant',
                  secretaire: 'Secrétaire',
                })[user.profile.role] : 'Utilisateur'}
              </p>
            </div>
            <ChevronDown className="hidden lg:block w-4 h-4 text-gray-500" />
          </button>
          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2">
              <Link to="/profile" onClick={() => setShowProfile(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mon profil</Link>
              <button onClick={() => { setShowProfile(false); handleLogout(); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Déconnexion</button>
            </div>
          )}
        </div>
      </div>
    </div>

    {selectedNotif && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setSelectedNotif(null)}>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setSelectedNotif(null)} className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">{notifTypeIcon(selectedNotif.notification_type)}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedNotif.title}</h3>
              <span className="text-xs font-medium text-gray-400">{({
                payment: 'Paiement',
                attendance: 'Absence',
                grade: 'Note',
                composition: 'Composition',
                login: 'Connexion',
                logout: 'Déconnexion',
                general: 'Général',
              })[selectedNotif.notification_type] || 'Général'}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedNotif.message}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{new Date(selectedNotif.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>{new Date(selectedNotif.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {!selectedNotif.is_read && (
            <button onClick={() => { handleMarkAsRead(selectedNotif.id); setSelectedNotif(null); }}
              className="mt-4 w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
              Marquer comme lu
            </button>
          )}
        </div>
      </div>
    )}
    <MessageModal
      open={logoutModal}
      variant="warning"
      title="Déconnexion"
      message="Voulez-vous vraiment vous déconnecter ?"
      onConfirm={() => { logout(); navigate('/login'); }}
      confirmLabel="Se déconnecter"
      onClose={() => setLogoutModal(false)}
    />
    </>
  );
};

export const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    import('../utils/theme').then((m) => m.loadSchoolTheme());
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onMenuToggle={() => setSidebarOpen(true)} />
      <main className="lg:ml-64 pt-16 px-4 pb-4 lg:px-6 lg:pb-6 min-h-screen">
        {children}
      </main>
    </div>
  );
};
