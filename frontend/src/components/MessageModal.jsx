import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ShieldOff, Info, X } from 'lucide-react';

const variants = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    button: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  denied: {
    icon: ShieldOff,
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
};

const MessageModal = ({ open, onClose, title, message, variant = 'info', confirmLabel, onConfirm }) => {
  useEffect(() => {
    if (!open || onConfirm) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [open, onConfirm, onClose]);

  if (!open) return null;
  const v = variants[variant] || variants.info;
  const Icon = v.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <div className="text-center">
          <div className={`w-14 h-14 rounded-full ${v.iconBg} flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-7 h-7 ${v.iconColor}`} />
          </div>
          {title && <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>}
          <p className="text-sm text-gray-500 mb-6 whitespace-pre-wrap">{message}</p>
        </div>
        <div className="flex space-x-3 pt-2">
          {onConfirm && (
            <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 ${v.button} text-white rounded-lg shadow-sm hover:shadow-md transition-all text-sm font-medium`}>
              {confirmLabel || 'Confirmer'}
            </button>
          )}
          <button onClick={onClose} className={`${onConfirm ? 'flex-1' : 'w-full'} px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium`}>
            {onConfirm ? 'Annuler' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
