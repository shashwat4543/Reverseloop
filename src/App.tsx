import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toasts';
import { AdminPage } from './pages/Admin';
import { ConfirmedPage } from './pages/Confirmed';
import { DriverPage } from './pages/Driver';
import { HubPage } from './pages/Hub';
import { LaunchPage } from './pages/Launch';
import { MatchPage } from './pages/Match';
import { PassportPage } from './pages/Passport';
import { AuthProvider } from './providers/AuthProvider';
import { I18nProvider } from './providers/I18nProvider';
import { TenantProvider } from './providers/TenantProvider';
import './styles.css';

export default function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <I18nProvider>
          <AuthProvider>
            <ToastProvider>
              <BrowserRouter>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Navigate to="/launch" replace />} />
                    <Route path="/launch" element={<LaunchPage />} />
                    <Route path="/match" element={<MatchPage />} />
                    <Route path="/confirmed/:itemId" element={<ConfirmedPage />} />
                    <Route path="/p/:publicId" element={<PassportPage />} />
                    <Route path="/driver" element={<DriverPage />} />
                    <Route path="/hub" element={<HubPage />} />
                    <Route path="/hub/:itemId" element={<HubPage />} />
                    <Route path="/admin/*" element={<AdminPage />} />
                    <Route
                      path="*"
                      element={
                        <div className="rl-card" style={{ maxWidth: '480px', margin: '2rem auto', textAlign: 'center' }}>
                          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>404 - Page Not Found</h2>
                          <p style={{ color: '#4B5563', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                            The requested page does not exist.
                          </p>
                          <a href="/launch" className="rl-btn rl-btn-primary">
                            Return to Launch
                          </a>
                        </div>
                      }
                    />
                  </Routes>
                </AppShell>
              </BrowserRouter>
            </ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
}
