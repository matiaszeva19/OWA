
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Locale, Translations } from '../types';
// Corrected imports to point to .ts files
import esTranslations from '../locales/es.ts';
import enTranslations from '../locales/en.ts';

interface LanguageContextType {
  language: Locale;
  setLanguage: (language: Locale) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}

const translations: Record<Locale, Translations> = {
  es: esTranslations,
  en: enTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Locale>(() => {
    const storedLang = localStorage.getItem('appLanguage') as Locale | null;
    if (storedLang && (storedLang === 'es' || storedLang === 'en')) {
      return storedLang;
    }
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'en' ? 'en' : 'es'; // Default to Spanish
  });

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    document.documentElement.lang = language; // Update lang attribute on HTML element
  }, [language]);

  const setLanguage = (lang: Locale) => {
    setLanguageState(lang);
  };

  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: string | Translations | undefined = translations[language];

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = (result as Translations)[k];
      } else {
        result = undefined; // Key not found
        break;
      }
    }
    
    if (typeof result !== 'string') {
      console.warn(`Translation key "${key}" not found or not a string for language "${language}".`);
      return key; // Return the key itself if not found
    }

    if (options) {
      return Object.entries(options).reduce((str, [optKey, optValue]) => {
        // Ensure optValue is explicitly converted to string before replace.
        // Handle potential HTML in optValue by NOT re-escaping if it's intentionally HTML.
        // However, for simple string replacement, direct conversion is fine.
        // If options could contain user-generated HTML, sanitization would be needed here.
        return str.replace(new RegExp(`{${optKey}}`, 'g'), String(optValue));
      }, result as string);
    }
    return result as string;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
