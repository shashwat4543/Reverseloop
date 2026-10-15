import React, { createContext, useContext, useState } from 'react';
import { setClientToken } from '../api/client';
import { Role } from '../types';
import { useI18n } from './I18nProvider';

export interface AuthContextValue {
  role: Role | null;
  token: string | null;
  signIn: (role?: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In-memory only, no localStorage or sessionStorage per security requirements
  const [role, setRole] = useState<Role | null>('CUSTOMER');
  const [token, setToken] = useState<string | null>('mock-jwt-customer-session');

  const signIn = (newRole: Role = 'DRIVER') => {
    setRole(newRole);
    const mockToken = `mock-token-${newRole.toLowerCase()}-${Date.now()}`;
    setToken(mockToken);
    setClientToken(mockToken);
  };

  const signOut = () => {
    setRole(null);
    setToken(null);
    setClientToken(null);
  };

  return (
    <AuthContext.Provider value={{ role, token, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

interface RequireRoleProps {
  requiredRole: Role;
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ requiredRole, children }) => {
  const { role, signIn } = useAuth();
  const { t } = useI18n();

  if (!role) {
    return (
      <div className="rl-card rl-auth-prompt" style={{ margin: '2rem auto', maxWidth: '420px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>Staff Sign-in Required</h2>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          You must sign in as <strong>{requiredRole}</strong> to access this portal.
        </p>
        <button
          type="button"
          className="rl-btn rl-btn-primary"
          style={{ width: '100%', marginBottom: '0.75rem' }}
          onClick={() => signIn(requiredRole)}
        >
          Sign in as {requiredRole}
        </button>
      </div>
    );
  }

  // Admins can inspect Driver and Hub flows if needed, but if exact role required:
  if (role !== requiredRole && role !== 'ADMIN') {
    return (
      <div className="rl-card rl-auth-error" style={{ margin: '2rem auto', maxWidth: '440px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>
          403 Forbidden: Access Denied
        </h2>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Current role is <strong>{role}</strong>. This page strictly requires <strong>{requiredRole}</strong> permissions.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="rl-btn rl-btn-primary"
            onClick={() => signIn(requiredRole)}
          >
            Switch to {requiredRole}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// OIDC Client Skeleton (optional non-mock path)
export class OidcAuthSkeleton {
  constructor(private issuer?: string, private clientId?: string) {}

  async login(): Promise<void> {
    console.info('OIDC skeleton login invoked with:', this.issuer, this.clientId);
  }

  async handleCallback(): Promise<void> {
    console.info('OIDC skeleton handleCallback');
  }
}
