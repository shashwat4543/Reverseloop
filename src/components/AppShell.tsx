import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { useI18n } from '../providers/I18nProvider';
import { useTenant } from '../providers/TenantProvider';
import { DevPanel } from './DevPanel';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { config } = useTenant();
  const { locale, setLocale, availableLocales, t } = useI18n();
  const { role } = useAuth();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navLinks = [
    { to: '/launch', label: 'Return Item' },
    { to: '/driver', label: 'Driver' },
    { to: '/hub', label: 'Hub' },
    { to: '/admin', label: 'Admin' },
  ];

  return (
    <div className="rl-app-shell">
      {!isOnline && (
        <div
          role="status"
          style={{
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            textAlign: 'center',
            padding: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {t('common.offline')}
        </div>
      )}

      <header className="rl-header no-print">
        <div className="rl-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/launch" className="rl-brand" aria-label="ReverseLoop Home">
              {config?.theme.logoUrl ? (
                <img src={config.theme.logoUrl} alt="ReverseLoop" className="rl-brand-logo" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              )}
              <span>ReverseLoop</span>
            </Link>

            <nav aria-label="Main Navigation" style={{ display: 'flex', gap: '0.5rem' }}>
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rl-btn rl-btn-ghost rl-btn-sm"
                    style={{
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? 'var(--rl-primary)' : 'var(--rl-text-main)',
                      borderBottom: isActive ? '2px solid var(--rl-primary)' : '2px solid transparent',
                      borderRadius: 0,
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="rl-header-actions">
            {role && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: '#E5E7EB',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  color: '#374151',
                }}
              >
                {role}
              </span>
            )}

            <label htmlFor="locale-select" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              Language
            </label>
            <select
              id="locale-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="rl-select"
              style={{
                width: 'auto',
                minHeight: '36px',
                paddingBlock: '0.25rem',
                paddingInline: '0.5rem',
                fontSize: '0.875rem',
              }}
              aria-label="Select language"
            >
              {availableLocales.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="rl-main" id="main-content">
        {children}
      </main>

      <footer className="rl-footer no-print">
        <p style={{ margin: 0 }}>
          {t('passport.privacy')}
        </p>
      </footer>

      <DevPanel />
    </div>
  );
};
