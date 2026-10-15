import React, { createContext, useContext, useEffect, useState } from 'react';
import { setClientLanguage } from '../api/client';
import arStrings from '../i18n/ar.json';
import enStrings from '../i18n/en.json';
import hiStrings from '../i18n/hi.json';
import { useTenant } from './TenantProvider';

type TranslationsMap = Record<string, string>;

const LOCAL_BUNDLES: Record<string, TranslationsMap> = {
  en: enStrings,
  hi: hiStrings,
  ar: arStrings,
};

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

function toPseudoLocale(text: string): string {
  // Pad and bracket for expansion testing (en-XA)
  const map: Record<string, string> = {
    a: 'å', e: 'é', i: 'î', o: 'ø', u: 'ü',
    A: 'Å', E: 'É', I: 'Î', O: 'Ø', U: 'Ü',
  };
  const transformed = text.replace(/[aeiouAEIOU]/g, (char) => map[char] || char);
  return `[!!! ${transformed} ~!~ !!!]`;
}

interface I18nContextValue {
  locale: string;
  setLocale: (lang: string) => void;
  availableLocales: { code: string; label: string; dir: 'ltr' | 'rtl' }[];
  isRtl: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useTenant();

  const searchParams = new URLSearchParams(window.location.search);
  const initialUrlLocale = searchParams.get('locale') || (config?.locale ?? 'en');

  const [locale, setLocaleState] = useState<string>(initialUrlLocale);

  useEffect(() => {
    if (config?.locale && !searchParams.get('locale')) {
      setLocaleState(config.locale);
    }
  }, [config?.locale]);

  const isRtl = RTL_LOCALES.has(locale);

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    setClientLanguage(locale);
  }, [locale, isRtl]);

  const setLocale = (newLocale: string) => {
    setLocaleState(newLocale);
    const url = new URL(window.location.href);
    url.searchParams.set('locale', newLocale);
    window.history.replaceState({}, '', url.toString());
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let rawText: string | undefined;

    if (locale === 'en-XA') {
      const base = enStrings[key as keyof typeof enStrings] || key;
      let text = toPseudoLocale(base);
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
        });
      }
      return text;
    }

    // 1. Tenant custom strings override for active locale
    if (config?.strings && config.strings[key]) {
      rawText = config.strings[key];
    }

    // 2. Local bundle for current locale
    if (!rawText && LOCAL_BUNDLES[locale]?.[key]) {
      rawText = LOCAL_BUNDLES[locale][key];
    }

    // 3. Fallback to tenant default locale
    const tenantDefault = config?.locale || 'en';
    if (!rawText && LOCAL_BUNDLES[tenantDefault]?.[key]) {
      rawText = LOCAL_BUNDLES[tenantDefault][key];
    }

    // 4. Fallback to standard English
    if (!rawText && enStrings[key as keyof typeof enStrings]) {
      rawText = enStrings[key as keyof typeof enStrings];
    }

    if (!rawText) {
      return key;
    }

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        rawText = rawText!.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }

    return rawText;
  };

  const availableLocales = [
    { code: 'en', label: 'English', dir: 'ltr' as const },
    { code: 'hi', label: 'हिन्दी (Hindi)', dir: 'ltr' as const },
    { code: 'ar', label: 'العربية (Arabic)', dir: 'rtl' as const },
    { code: 'en-XA', label: 'Pseudo-Locale [en-XA]', dir: 'ltr' as const },
  ];

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        availableLocales,
        isRtl,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
