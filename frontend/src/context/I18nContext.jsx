import { createContext, useContext, useState, useCallback } from 'react';
import { getTranslation, formatDate, formatCurrency, formatNumber, formatRelativeTime, SUPPORTED_LOCALES } from '../i18n';

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('locale') || navigator.language?.split('-')[0] || 'en';
  });

  const changeLocale = useCallback((newLocale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key) => getTranslation(locale, key), [locale]);

  const value = {
    locale,
    setLocale: changeLocale,
    t,
    supportedLocales: SUPPORTED_LOCALES,
    formatDate: (date, format) => formatDate(date, locale, format),
    formatCurrency: (amount, currency) => formatCurrency(amount, currency, locale),
    formatNumber: (num) => formatNumber(num, locale),
    formatRelativeTime: (date) => formatRelativeTime(date, locale),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};

export default I18nContext;
