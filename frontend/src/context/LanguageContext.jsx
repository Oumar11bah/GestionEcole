import { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import i18n from '../i18n';
import { useAuth } from './AuthContext';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { user } = useAuth();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const changeLanguage = useCallback((lng) => {
    i18n.changeLanguage(lng);
    if (userRef.current?.profile?.role === 'super_admin') {
      localStorage.setItem('i18nextLng', lng);
    }
  }, []);

  useEffect(() => {
    if (user?.profile?.language) {
      const lang = user.profile.language;
      i18n.changeLanguage(lang);
      if (user.profile.role === 'super_admin') {
        localStorage.setItem('i18nextLng', lang);
      }
    }
  }, [user?.profile?.language, user?.profile?.role]);

  return (
    <LanguageContext.Provider value={{ changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
