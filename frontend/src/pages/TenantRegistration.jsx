import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tenantService } from '../services/api';
import {
  Building, Mail, Phone, User, Lock, ArrowLeft, CheckCircle,
  AlertCircle, Eye, EyeOff
} from 'lucide-react';

const TenantRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    school_name: '',
    admin_username: '',
    admin_email: '',
    admin_password: '',
    admin_first_name: '',
    admin_last_name: '',
    contact_phone: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await tenantService.register(form);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === 'object') {
        const msgs = Object.values(detail).flat().join('. ');
        setError(msgs || 'Erreur lors de l\'inscription');
      } else {
        setError(detail || 'Erreur lors de l\'inscription');
      }
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inscription réussie !</h2>
          <p className="text-gray-500 mb-6">
            Votre demande a été soumise. Un administrateur va activer votre compte sous peu.
            Vous recevrez un email de confirmation.
          </p>
          <Link to="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b">
          <Link to="/login" className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la connexion</span>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Inscription établissement</h1>
              <p className="text-sm text-gray-500">Créez votre compte scolaire</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'école <span className="text-red-500">*</span>
            </label>
            <input type="text" name="school_name" value={form.school_name} onChange={handleChange} required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: École Privée les Pigeons" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input type="text" name="admin_first_name" value={form.admin_first_name} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input type="text" name="admin_last_name" value={form.admin_last_name} onChange={handleChange} required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom d'utilisateur <span className="text-red-500">*</span>
            </label>
            <input type="text" name="admin_username" value={form.admin_username} onChange={handleChange} required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="admin" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input type="email" name="admin_email" value={form.admin_email} onChange={handleChange} required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="contact@ecole.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone
            </label>
            <input type="tel" name="contact_phone" value={form.contact_phone} onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="+224 6XX XXX XXX" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="admin_password"
                value={form.admin_password} onChange={handleChange} required minLength={8}
                className="w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="8 caractères minimum" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2">
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
            <span>{loading ? 'Inscription en cours...' : 'Créer mon compte établissement'}</span>
          </button>

          <p className="text-xs text-center text-gray-400">
            En créant un compte, vous acceptez nos conditions d'utilisation.
            Votre compte sera activé après vérification par l'administrateur.
          </p>
        </form>
      </div>
    </div>
  );
};

export default TenantRegistration;