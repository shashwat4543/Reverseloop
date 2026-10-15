import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { PublicTenantConfig, Theme } from '../types';

interface TenantContextValue {
  config: PublicTenantConfig | null;
  loading: boolean;
  error: Error | null;
  slug: string;
  refreshConfig: () => Promise<void>;
  updatePreviewTheme?: (theme: Partial<Theme>) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

function getContrastColor(hexColor: string): '#FFFFFF' | '#111827' {
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return '#FFFFFF';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  // Relative luminance formula per WCAG 2.1
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#111827' : '#FFFFFF';
}

function applyThemeVariables(theme?: Theme, isRtl?: boolean) {
  const root = document.documentElement;
  const primary = theme?.primaryColor || '#8B2E16';
  const accent = theme?.accentColor || '#E0701B';
  const primaryContrast = getContrastColor(primary);
  const accentContrast = getContrastColor(accent);

  root.style.setProperty('--rl-primary', primary);
  root.style.setProperty('--rl-primary-contrast', primaryContrast);
  root.style.setProperty('--rl-accent', accent);
  root.style.setProperty('--rl-accent-contrast', accentContrast);

  let fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  if (theme?.fontFamily === 'serif') {
    fontStack = 'Georgia, Cambria, "Times New Roman", Times, serif';
  } else if (theme?.fontFamily === 'rounded') {
    fontStack = '"Quicksand", "Nunito", system-ui, -apple-system, sans-serif';
  }
  root.style.setProperty('--rl-font', fontStack);
  document.body.style.fontFamily = fontStack;

  if (typeof isRtl === 'boolean') {
    root.dir = isRtl ? 'rtl' : 'ltr';
  }
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PublicTenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const slug = searchParams.get('tenant') || 'demo';
  const urlLocale = searchParams.get('locale') || undefined;

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicConfig(slug, urlLocale);
      setConfig(data);
      applyThemeVariables(data.theme, data.rtl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [slug, urlLocale]);

  const updatePreviewTheme = (themeUpdates: Partial<Theme>) => {
    if (!config) return;
    const merged = { ...config.theme, ...themeUpdates };
    applyThemeVariables(merged, config.rtl);
  };

  return (
    <TenantContext.Provider
      value={{
        config,
        loading,
        error,
        slug,
        refreshConfig: loadConfig,
        updatePreviewTheme,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
