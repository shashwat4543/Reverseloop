import React, { useState } from 'react';
import { DevScenario, getDevScenario, resetMockData, setDevScenario } from '../api/mock';
import { useAuth } from '../providers/AuthProvider';
import { useI18n } from '../providers/I18nProvider';
import { useTenant } from '../providers/TenantProvider';
import { Role } from '../types';

export const DevPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScenario, setActiveScenarioState] = useState<DevScenario>(getDevScenario());
  const { role, signIn, signOut } = useAuth();
  const { config, slug } = useTenant();
  const { locale } = useI18n();

  const handleScenarioChange = (scenario: DevScenario) => {
    setActiveScenarioState(scenario);
    setDevScenario(scenario);
  };

  const handleRoleChange = (newRole: Role) => {
    signIn(newRole);
  };

  const handleReset = () => {
    resetMockData();
    setActiveScenarioState('happy');
    window.location.reload();
  };

  const roles: Role[] = ['CUSTOMER', 'DRIVER', 'HUB', 'ADMIN'];

  const scenarios: { key: DevScenario; label: string; desc: string }[] = [
    { key: 'happy', label: 'Happy Path', desc: 'Standard successful execution' },
    { key: 'noMatch', label: 'No Match', desc: 'Force capacity exhaustion on next match' },
    { key: 'rejected', label: 'Reject Eligibility', desc: 'Force 422 rejected eligibility' },
    { key: 'conflict', label: '409 Conflict', desc: 'Simulate concurrent modification conflict' },
    { key: 'rateLimit', label: '429 Rate Limit', desc: 'Simulate rate limit exhaustion' },
    { key: 'serverError', label: '500 Server Error', desc: 'Simulate 500 internal server error' },
    { key: 'slow', label: 'Slow (3s)', desc: 'Inject 3-second simulated network latency' },
  ];

  return (
    <>
      <button
        type="button"
        className="rl-dev-btn no-print"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle developer control panel"
        aria-expanded={isOpen}
      >
        <span>🛠️</span>
        <span>Dev: {role || 'NONE'}</span>
        {activeScenario !== 'happy' && (
          <span
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              borderRadius: '9999px',
              padding: '2px 6px',
              fontSize: '0.6875rem',
            }}
          >
            {activeScenario}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="rl-dev-panel no-print" role="dialog" aria-label="Developer Panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>🛠️ Mock DevPanel</h3>
            <button
              type="button"
              className="rl-btn-ghost rl-btn-sm"
              onClick={() => setIsOpen(false)}
              style={{ fontSize: '1.25rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
              aria-label="Close developer panel"
            >
              &times;
            </button>
          </div>

          {/* Context state info */}
          <div style={{ padding: '0.5rem', background: '#F3F4F6', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
            <div><strong>Tenant:</strong> {slug} ({config?.dataMode || 'SIMULATED'})</div>
            <div><strong>Locale:</strong> {locale}</div>
            <div><strong>Active Role:</strong> {role || 'None'}</div>
          </div>

          {/* Role switcher */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="rl-label" style={{ fontSize: '0.875rem' }}>Active User Role (MockAuth):</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`rl-btn rl-btn-sm ${role === r ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                  onClick={() => handleRoleChange(r)}
                  style={{ fontSize: '0.8125rem' }}
                >
                  {r}
                </button>
              ))}
            </div>
            {role && (
              <button
                type="button"
                className="rl-btn rl-btn-ghost rl-btn-sm"
                onClick={signOut}
                style={{ width: '100%', marginTop: '0.375rem', fontSize: '0.75rem', color: '#B91C1C' }}
              >
                Sign out (No role)
              </button>
            )}
          </div>

          {/* Scenario simulator */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="rl-label" style={{ fontSize: '0.875rem' }}>Next API Call Scenario:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {scenarios.map((sc) => (
                <button
                  key={sc.key}
                  type="button"
                  className={`rl-btn rl-btn-sm ${activeScenario === sc.key ? 'rl-btn-accent' : 'rl-btn-secondary'}`}
                  onClick={() => handleScenarioChange(sc.key)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'start',
                    minHeight: 'auto',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{sc.label}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{sc.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            type="button"
            className="rl-btn rl-btn-secondary rl-btn-sm"
            onClick={handleReset}
            style={{ width: '100%', borderColor: '#DC2626', color: '#DC2626' }}
          >
            Reset Seed Data & State
          </button>
        </div>
      )}
    </>
  );
};
