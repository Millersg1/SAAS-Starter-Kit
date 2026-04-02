import en from './locales/en.json';
import es from './locales/es.json';

const locales = { en, es };

const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

/**
 * Get translation by dot-notation key.
 * Example: t('common.save') => 'Save'
 */
function getTranslation(locale, key) {
  const messages = locales[locale] || locales.en;
  const keys = key.split('.');
  let result = messages;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      // Fallback to English
      let fallback = locales.en;
      for (const fk of keys) {
        fallback = fallback?.[fk];
      }
      return fallback || key;
    }
  }
  return result;
}

/**
 * Format a date according to user locale.
 */
function formatDate(date, locale = 'en', format = 'short') {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const options = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    full: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  };

  return new Intl.DateTimeFormat(locale, options[format] || options.short).format(d);
}

/**
 * Format currency according to user locale.
 */
function formatCurrency(amount, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number according to user locale.
 */
function formatNumber(num, locale = 'en') {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Get relative time (e.g., "2 hours ago").
 */
function formatRelativeTime(date, locale = 'en') {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (days > 0) return rtf.format(-days, 'day');
  if (hours > 0) return rtf.format(-hours, 'hour');
  if (minutes > 0) return rtf.format(-minutes, 'minute');
  return rtf.format(-seconds, 'second');
}

export {
  locales,
  SUPPORTED_LOCALES,
  getTranslation,
  formatDate,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
};
