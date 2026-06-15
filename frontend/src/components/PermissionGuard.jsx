import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PermissionGuard = ({ module, children }) => {
  const { user, canAccess } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canAccess(module)) {
      navigate('/dashboard', { replace: true });
    }
  }, [module, canAccess, navigate]);

  if (!canAccess(module)) return null;

  return children;
};

export default PermissionGuard;