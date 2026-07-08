import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import {
  Eye, EyeOff, RefreshCw, Shield, LogIn, UserPlus, ArrowLeft,
  AlertTriangle, Lock, AlertCircle, Phone, Mail, X
} from 'lucide-react';

const BONUS_ATTEMPTS = 2;

const images = [
  new URL('../assets/COL1.webp', import.meta.url).href,
  new URL('../assets/COL3.png', import.meta.url).href,
  new URL('../assets/COL4.png', import.meta.url).href,
  new URL('../assets/COL5.png', import.meta.url).href,
  new URL('../assets/COL6.png', import.meta.url).href,
  new URL('../assets/COL7.png', import.meta.url).href,
  new URL('../assets/COL8.png', import.meta.url).href,
  new URL('../assets/COL9.png', import.meta.url).href,
];

const Toast = ({ message, type, onClose }) => {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    security: 'bg-orange-50 border-orange-200 text-orange-800',
  };
  const icons = { success: '✓', warning: '⚠', error: '!', security: '🔒' };

  return (
    <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl border shadow-lg text-sm flex items-center space-x-3 animate-slide-in ${colors[type] || colors.error}`}>
      <span className="font-bold">{icons[type] || '!'}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const Login = () => {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminData, setAdminData] = useState({
    nom: '', prenom: '', username: '', password: '', confirmPassword: ''
  });
  const [adminSuccess, setAdminSuccess] = useState('');
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);

  React.useEffect(() => {
    authService.loginState('').then(res => {
      if (res.data.has_super_admin) setHasSuperAdmin(true);
    }).catch(() => {});
  }, []);

  const [securityState, setSecurityState] = useState({
    locked: false, lockoutSeconds: 0, blocked: false,
    isLastAttempt: false, attemptsRemaining: 0, adminContact: null,
  });
  const [toast, setToast] = useState({ message: '', type: '' });
  const [showWarning, setShowWarning] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const initialLockoutRef = useRef(45);

  const logoUrl = new URL('../assets/LOG.png', import.meta.url).href;

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((lockoutUntil - Date.now()) / 1000));
      setSecurityState(prev => {
        if (remaining <= 0) {
          return { ...prev, locked: false, lockoutSeconds: 0 };
        }
        return { ...prev, locked: true, lockoutSeconds: remaining };
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  React.useEffect(() => {
    if (!credentials.username || showAdminForm) return;
    const timer = setTimeout(async () => {
      try {
        const res = await authService.loginState(credentials.username);
        if (res.data.blocked) {
          setSecurityState(prev => ({
            ...prev, blocked: true, adminContact: res.data.admin_contact || null,
          }));
          setError(res.data.error || t('login.accountBlockedTemp'));
        } else if (res.data.locked && !securityState.locked) {
          initialLockoutRef.current = res.data.lockout_seconds || 45;
          setLockoutUntil(Date.now() + (res.data.lockout_seconds || 45) * 1000);
          setSecurityState(prev => ({
            ...prev, locked: true,
            lockoutSeconds: res.data.lockout_seconds || 45,
          }));
          setError(res.data.error || '');
        }
      } catch (e) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [credentials.username, showAdminForm]);

  const clearToast = useCallback(() => setToast({ message: '', type: '' }), []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (adminData.password !== adminData.confirmPassword) {
      setError(t('login.passwordsNoMatch'));
      setLoading(false);
      return;
    }

    try {
      const response = await authService.setupAdmin({
        username: adminData.username,
        password: adminData.password,
        confirm_password: adminData.confirmPassword,
        first_name: adminData.prenom,
        last_name: adminData.nom,
      });
      setAdminSuccess(response.data.message || t('login.adminCreated'));
      setToast({ message: t('login.adminCreated'), type: 'success' });
      setHasSuperAdmin(true);
      setAdminData({ nom: '', prenom: '', username: '', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || t('login.adminCreateError'));
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormDisabled) return;
    setLoading(true);
    setError('');
    setShowWarning(false);

    const result = await login(credentials);
    if (result.success) {
      setLockoutUntil(null);
      setSecurityState({
        locked: false, lockoutSeconds: 0, blocked: false,
        isLastAttempt: false, attemptsRemaining: 0, adminContact: null,
      });
      navigate('/dashboard');
    } else {
      const data = result.responseData || {};

      if (data.blocked) {
        setSecurityState(prev => ({
          ...prev, blocked: true, attemptsRemaining: 0,
          adminContact: data.admin_contact || null,
        }));
        setError(data.error || t('login.accountBlockedTemp'));
        setToast({ message: t('login.accountBlockedSecurity'), type: 'security' });
      } else if (data.locked) {
        initialLockoutRef.current = data.lockout_seconds || 45;
        setLockoutUntil(Date.now() + (data.lockout_seconds || 45) * 1000);
        setSecurityState(prev => ({
          ...prev, locked: true,
          lockoutSeconds: data.lockout_seconds || 45,
          attemptsRemaining: data.attempts_remaining || 0,
        }));
        setError(data.error || t('login.tooManyAttempts'));
        setToast({ message: t('login.requestSlowed'), type: 'warning' });
      } else {
        setSecurityState(prev => ({
          ...prev,
          attemptsRemaining: data.attempts_remaining || 0,
          isLastAttempt: data.is_last_attempt || false,
        }));

        if (data.is_last_attempt) {
          setShowWarning(true);
          setToast({ message: t('login.lastAttemptWarning'), type: 'warning' });
        }

        if (data.attempts_remaining > 0 && data.attempts_remaining <= BONUS_ATTEMPTS) {
          setError(data.error || t('login.attemptsRemaining', { count: data.attempts_remaining }));
        } else {
          setError(data.error || result.error);
        }
      }
    }
    setLoading(false);
  };

  const handleUnblockReset = () => {
    setLockoutUntil(null);
    setSecurityState({
      locked: false, lockoutSeconds: 0, blocked: false,
      isLastAttempt: false, attemptsRemaining: 0, adminContact: null,
    });
    setError('');
    setCredentials({ username: '', password: '' });
  };

  const isFormDisabled = securityState.blocked || securityState.locked;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Toast message={toast.message} type={toast.type} onClose={clearToast} />

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        {images.map((img, index) => (
          <div key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              index === currentBg ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/50 to-indigo-900/70" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center text-white px-8">
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl" />
                <img src={logoUrl} alt="Logo" className="w-36 h-36 rounded-2xl object-contain relative" />
              </div>
              <h1 className="text-4xl font-bold mt-4 tracking-tight">{t('login.brandName')}</h1>
              <div className="h-1 w-16 bg-blue-400 rounded-full mx-auto mt-3" />
            </div>
            <p className="text-blue-200/80 text-lg max-w-md mx-auto leading-relaxed">
              {t('login.subtitle')}
            </p>
            <div className="mt-12 flex items-center justify-center space-x-8 text-blue-200/60 text-sm">
              <span className="flex items-center space-x-2"><Shield className="w-4 h-4" /><span>{t('login.secure')}</span></span>
              <span className="flex items-center space-x-2"><LogIn className="w-4 h-4" /><span>{t('login.controlledAccess')}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4 ring-4 ring-blue-100" />
            <h1 className="text-2xl font-bold text-gray-900">{t('login.brandName')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('login.mobileSubtitle')}</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-gray-100 p-8 sm:p-10 transition-all duration-300">
            {!showAdminForm ? (
              <>
                {securityState.blocked && (
                  <div className="mb-6 bg-red-50/80 border-2 border-red-300 rounded-2xl p-5 text-center animate-fade-in">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-red-100">
                      <Lock className="w-7 h-7 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-red-700 mb-1">{t('login.blockedTitle')}</h3>
                    <p className="text-sm text-red-600/80 mb-4">
                      {t('login.blockedMessage')}
                    </p>
                    {securityState.adminContact && (
                      <div className="space-y-2 text-sm text-red-700">
                        <div className="flex items-center justify-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span className="font-medium">{securityState.adminContact.phone || t('login.notProvided')}</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span className="font-medium">{securityState.adminContact.email || t('login.notProvided')}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 inline-flex items-center space-x-1.5 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span>{t('login.blockedBadge')}</span>
                    </div>
                  </div>
                )}

                {securityState.locked && !securityState.blocked && (
                  <div className="mb-6 bg-orange-50/80 border-2 border-orange-200 rounded-2xl p-5 text-center animate-fade-in">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-orange-100">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-base font-bold text-orange-700 mb-1">{t('login.slowedTitle')}</h3>
                    <p className="text-sm text-orange-600/80 mb-3">
                      {t('login.slowedMessage', { seconds: securityState.lockoutSeconds })}
                    </p>
                    <div className="text-2xl font-bold text-orange-600 mb-1 font-mono">
                      {securityState.lockoutSeconds}s
                    </div>
                    <div className="w-full bg-orange-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(securityState.lockoutSeconds / initialLockoutRef.current) * 100}%` }} />
                    </div>
                    {securityState.attemptsRemaining > 0 && (
                      <p className="text-xs text-orange-600 mt-2">
                        {t('login.attemptsAfterDelay', { count: securityState.attemptsRemaining })}
                      </p>
                    )}
                  </div>
                )}

                {showWarning && !securityState.blocked && !securityState.locked && (
                  <div className="mb-6 bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-5 animate-fade-in">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-amber-100">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-amber-800">{t('login.warningTitle')}</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          {t('login.warningMessage')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg ring-4 ring-blue-50
                    ${securityState.blocked ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      securityState.locked ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                      'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                    {securityState.blocked ? <Lock className="w-8 h-8 text-white" /> :
                     securityState.locked ? <AlertCircle className="w-8 h-8 text-white" /> :
                     <Shield className="w-8 h-8 text-white" />}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {securityState.blocked ? t('login.accessBlocked') :
                     securityState.locked ? t('login.security') :
                     t('login.welcome')}
                  </h2>
                  <p className="text-gray-500 mt-1.5">
                    {securityState.blocked ? t('login.contactAdmin') :
                     securityState.locked ? t('login.slowedSubtitle') :
                     t('login.loginPrompt')}
                  </p>
                </div>

                {error && !securityState.blocked && (
                  <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-5 py-3.5 rounded-xl mb-6 text-sm flex items-start space-x-3">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ring-2 ring-red-200">
                      <span className="text-xs font-bold">!</span>
                    </div>
                    <div className="flex-1"><span>{error}</span></div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        <span>{t('login.username')}</span>
                      </span>
                    </label>
                    <div className="relative group">
                      <input type="text" required autoFocus={!securityState.blocked}
                        disabled={isFormDisabled}
                        className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm placeholder:text-gray-400
                          ${isFormDisabled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' :
                            'bg-white border-gray-200 group-hover:border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'}`}
                        placeholder={t('login.usernamePlaceholder')}
                        value={credentials.username}
                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <span className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        <span>{t('login.password')}</span>
                      </span>
                    </label>
                    <div className="relative group">
                      <input type={showPassword ? 'text' : 'password'} required
                        disabled={isFormDisabled}
                        className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm placeholder:text-gray-400 pr-12
                          ${isFormDisabled ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' :
                            'bg-white border-gray-200 group-hover:border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'}`}
                        placeholder={t('login.passwordPlaceholder')}
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      />
                      <button type="button" onClick={() => !isFormDisabled && setShowPassword(!showPassword)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg transition-all
                          ${isFormDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading || isFormDisabled}
                    className={`w-full py-3.5 rounded-xl font-semibold shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2.5 transition-all duration-200
                      ${isFormDisabled
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700'
                      }`}>
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <LogIn className="w-5 h-5" />
                    )}
                    <span>
                      {loading ? t('login.connecting') :
                       securityState.blocked ? t('login.cannotConnect') :
                       securityState.locked ? t('login.pleaseWait', { seconds: securityState.lockoutSeconds }) :
                       t('login.signIn')}
                    </span>
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100/80 space-y-3">
                  {!securityState.blocked && !hasSuperAdmin && (
                    <div className="text-center">
                      <button type="button" onClick={() => { setShowAdminForm(true); setError(''); }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline underline-offset-2">
                        {t('login.createAdmin')}
                      </button>
                    </div>
                  )}
                  {securityState.blocked && (
                    <div className="text-center">
                      <button type="button" onClick={handleUnblockReset}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">
                        {t('login.retryOtherAccount')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200/50 ring-4 ring-emerald-50">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('login.newAdminTitle')}</h2>
                  <p className="text-gray-500 mt-1.5">{t('login.newAdminSubtitle')}</p>
                </div>

                {error && (
                  <div className="bg-red-50/80 backdrop-blur border border-red-200 text-red-700 px-5 py-3.5 rounded-xl mb-6 text-sm flex items-start space-x-3">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ring-2 ring-red-200">
                      <span className="text-xs font-bold">!</span>
                    </div>
                    <span>{error}</span>
                  </div>
                )}

                {adminSuccess && (
                  <div className="bg-emerald-50/80 backdrop-blur border border-emerald-200 text-emerald-700 px-5 py-3.5 rounded-xl mb-6 text-sm flex items-center space-x-3">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-emerald-200">
                      <span className="text-xs font-bold">✓</span>
                    </div>
                    <span>{adminSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.lastName')}</label>
                      <input type="text" required
                        className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-all duration-200 text-sm placeholder:text-gray-400"
                        placeholder={t('login.lastNamePlaceholder')}
                        value={adminData.nom}
                        onChange={(e) => setAdminData({ ...adminData, nom: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.firstName')}</label>
                      <input type="text" required
                        className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-all duration-200 text-sm placeholder:text-gray-400"
                        placeholder={t('login.firstNamePlaceholder')}
                        value={adminData.prenom}
                        onChange={(e) => setAdminData({ ...adminData, prenom: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.adminUsername')}</label>
                    <input type="text" required
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-all duration-200 text-sm placeholder:text-gray-400"
                      placeholder={t('login.adminUsernamePlaceholder')}
                      value={adminData.username}
                      onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.adminPassword')}</label>
                    <input type="password" required
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-all duration-200 text-sm placeholder:text-gray-400"
                      placeholder={t('login.passwordPlaceholder')}
                      value={adminData.password}
                      onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.confirmPassword')}</label>
                    <input type="password" required
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition-all duration-200 text-sm placeholder:text-gray-400"
                      placeholder={t('login.passwordPlaceholder')}
                      value={adminData.confirmPassword}
                      onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    />
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg shadow-emerald-200/50 active:scale-[0.98] flex items-center justify-center space-x-2.5">
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <UserPlus className="w-5 h-5" />
                    )}
                    <span>{loading ? t('login.creating') : t('login.createAdminButton')}</span>
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100/80">
                  <button type="button" onClick={() => { setShowAdminForm(false); setError(''); setAdminSuccess(''); }}
                    className="w-full flex items-center justify-center space-x-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{t('login.backToLogin')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;