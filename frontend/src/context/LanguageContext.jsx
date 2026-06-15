import { createContext, useContext, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const changeLanguage = useCallback((lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  }, [i18n]);

  useEffect(() => {
    if (user?.profile?.language) {
      const lang = user.profile.language;
      i18n.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
    }
  }, [user?.profile?.language, i18n]);

  return (
    <LanguageContext.Provider value={{ changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
