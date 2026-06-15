import React from 'react';
import { ShieldOff, X } from 'lucide-react';

const AccessDeniedModal = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-pop">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-sm text-gray-500 mb-6">
          Désolé, vous n'avez pas accès à cette fonctionnalité.<br />
          Veuillez contacter l'administrateur.
        </p>
        <button onClick={onClose} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
          Fermer
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedModal;
