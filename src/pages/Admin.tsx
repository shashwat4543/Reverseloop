import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../components/Toasts';
import enStrings from '../i18n/en.json';
import { RequireRole } from '../providers/AuthProvider';
import { useI18n } from '../providers/I18nProvider';
import { useTenant } from '../providers/TenantProvider';
import { ApiError, Category, EligibilityResult, Item, TenantConfig, Webhook } from '../types';

type AdminTab = 'branding' | 'wording' | 'rules' | 'data' | 'integrations' | 'dashboard';

export const AdminContent: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const { slug, refreshConfig, updatePreviewTheme } = useTenant();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('branding');
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState(false);

  // Dashboard metrics
  const [items, setItems] = useState<Item[]>([]);

  // Integrations state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['item.registered', 'item.outcome_verified']);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Wording state
  const [editingLocale, setEditingLocale] = useState<string>('en');
  const [wordingTranslations, setWordingTranslations] = useState<Record<string, string>>({});
  const [missingOnly, setMissingOnly] = useState(false);
  const [newLocaleCode, setNewLocaleCode] = useState('');

  // Sample testing form in rules
  const [testCat, setTestCat] = useState<Category>('ELECTRONICS');
  const [testZone, setTestZone] = useState('A');
  const [testSize, setTestSize] = useState(1);
  const [testDesc, setTestDesc] = useState('');
  const [testResult, setTestResult] = useState<EligibilityResult | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setConflictError(false);
      const [cfg, allItems, whs] = await Promise.all([
        api.getConfig(slug),
        api.listItems(),
        api.listWebhooks(),
      ]);
      setConfig(cfg);
      setItems(allItems.items);
      setWebhooks(whs.webhooks);
      setWordingTranslations(cfg.strings[editingLocale] || {});
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [slug]);

  const saveConfig = async (updatedConfig: TenantConfig) => {
    try {
      setSaving(true);
      setConflictError(false);
      const saved = await api.putConfig(slug, updatedConfig);
      setConfig(saved);
      await refreshConfig();
      showToast(t('admin.save') + ' successful', 'success');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(true);
        showToast(t('admin.conflict'), 'error');
      } else {
        showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div style={{ maxWidth: '800px', marginInline: 'auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  // Conflict warning
  if (conflictError) {
    return (
      <div className="rl-card" style={{ maxWidth: '540px', marginInline: 'auto', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', color: '#991B1B', marginBottom: '0.5rem' }}>{t('admin.conflict')}</h2>
        <button type="button" className="rl-btn rl-btn-primary" onClick={fetchAdminData}>
          Reload Configuration
        </button>
      </div>
    );
  }

  // Dashboard calculations
  const totalItems = items.length;
  const verifiedCount = items.filter((i) => i.verified).length;
  const verifiedRate = totalItems > 0 ? Math.round((verifiedCount / totalItems) * 100) : 0;
  const statusCounts = items.reduce((acc, it) => {
    acc[it.status] = (acc[it.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ maxWidth: '840px', marginInline: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>System Administration</h1>
        {config.dataMode === 'SIMULATED' && (
          <span className="rl-status-chip registered" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            Simulated Data Mode
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', overflowX: 'auto', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
        {(['branding', 'wording', 'rules', 'data', 'integrations', 'dashboard'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rl-btn rl-btn-sm ${activeTab === tab ? 'rl-btn-primary' : 'rl-btn-ghost'}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`admin.${tab}` as any)}
          </button>
        ))}
      </div>

      {/* TAB: BRANDING */}
      {activeTab === 'branding' && (
        <div className="rl-card">
          <h2 className="rl-card-title">{t('admin.branding')}</h2>
          <div className="rl-form-group">
            <label className="rl-label">Logo URL</label>
            <input
              type="text"
              className="rl-input"
              value={config.theme.logoUrl || ''}
              placeholder="https://example.com/logo.svg"
              onChange={(e) => {
                const updated = { ...config, theme: { ...config.theme, logoUrl: e.target.value } };
                setConfig(updated);
                updatePreviewTheme?.({ logoUrl: e.target.value });
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="rl-label">Primary Brand Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={config.theme.primaryColor || '#8B2E16'}
                  onChange={(e) => {
                    const updated = { ...config, theme: { ...config.theme, primaryColor: e.target.value } };
                    setConfig(updated);
                    updatePreviewTheme?.({ primaryColor: e.target.value });
                  }}
                  style={{ width: '48px', height: '44px', padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="rl-input"
                  value={config.theme.primaryColor || '#8B2E16'}
                  onChange={(e) => {
                    const updated = { ...config, theme: { ...config.theme, primaryColor: e.target.value } };
                    setConfig(updated);
                    updatePreviewTheme?.({ primaryColor: e.target.value });
                  }}
                />
              </div>
            </div>

            <div>
              <label className="rl-label">Accent Highlight Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={config.theme.accentColor || '#E0701B'}
                  onChange={(e) => {
                    const updated = { ...config, theme: { ...config.theme, accentColor: e.target.value } };
                    setConfig(updated);
                    updatePreviewTheme?.({ accentColor: e.target.value });
                  }}
                  style={{ width: '48px', height: '44px', padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="rl-input"
                  value={config.theme.accentColor || '#E0701B'}
                  onChange={(e) => {
                    const updated = { ...config, theme: { ...config.theme, accentColor: e.target.value } };
                    setConfig(updated);
                    updatePreviewTheme?.({ accentColor: e.target.value });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rl-form-group">
            <label className="rl-label">Font Family</label>
            <select
              className="rl-select"
              value={config.theme.fontFamily || 'system'}
              onChange={(e) => {
                const val = e.target.value as 'system' | 'serif' | 'rounded';
                const updated = { ...config, theme: { ...config.theme, fontFamily: val } };
                setConfig(updated);
                updatePreviewTheme?.({ fontFamily: val });
              }}
            >
              <option value="system">System Default</option>
              <option value="serif">Editorial Serif</option>
              <option value="rounded">Modern Rounded</option>
            </select>
          </div>

          {/* Live Preview Card */}
          <div style={{ padding: '1rem', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '1.25rem', backgroundColor: '#F9FAFB' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.5rem' }}>LIVE PREVIEW</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" className="rl-btn rl-btn-primary rl-btn-sm">Primary Action</button>
              <button type="button" className="rl-btn rl-btn-accent rl-btn-sm">Accent Highlight</button>
            </div>
          </div>

          <button
            type="button"
            className="rl-btn rl-btn-primary"
            onClick={() => saveConfig(config)}
            disabled={saving}
          >
            {saving ? 'Saving...' : t('admin.save')}
          </button>
        </div>
      )}

      {/* TAB: WORDING */}
      {activeTab === 'wording' && (
        <div className="rl-card">
          <h2 className="rl-card-title">{t('admin.wording')}</h2>

          {/* Locale switcher & Add locale */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Active Locale:</span>
            {['en', 'hi', 'ar'].map((loc) => (
              <button
                key={loc}
                type="button"
                className={`rl-btn rl-btn-sm ${editingLocale === loc ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                onClick={() => {
                  setEditingLocale(loc);
                  setWordingTranslations(config.strings[loc] || {});
                }}
              >
                {loc.toUpperCase()}
              </button>
            ))}

            <div style={{ display: 'flex', gap: '0.25rem', marginInlineStart: 'auto' }}>
              <input
                type="text"
                placeholder="code (e.g. es)"
                className="rl-input"
                style={{ width: '100px', minHeight: '36px', padding: '0.25rem 0.5rem' }}
                value={newLocaleCode}
                onChange={(e) => setNewLocaleCode(e.target.value.toLowerCase().trim())}
              />
              <button
                type="button"
                className="rl-btn rl-btn-secondary rl-btn-sm"
                onClick={() => {
                  if (newLocaleCode) {
                    setEditingLocale(newLocaleCode);
                    setWordingTranslations(config.strings[newLocaleCode] || {});
                    setNewLocaleCode('');
                  }
                }}
              >
                + Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={missingOnly}
                onChange={(e) => setMissingOnly(e.target.checked)}
              />
              Show Missing Only
            </label>

            <button
              type="button"
              className="rl-btn rl-btn-secondary rl-btn-sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify(config.strings[editingLocale] || {}, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `translations-${editingLocale}.json`;
                a.click();
              }}
            >
              Export JSON
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '6px', marginBottom: '1rem' }}>
            {Object.entries(enStrings)
              .filter(([k]) => !missingOnly || !wordingTranslations[k])
              .slice(0, 15)
              .map(([key, defaultEnglish]) => (
                <div key={key} style={{ padding: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'monospace' }}>{key}</div>
                  <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem', color: '#374151' }}>EN: {defaultEnglish}</div>
                  <input
                    type="text"
                    className="rl-input"
                    style={{ minHeight: '36px', fontSize: '0.875rem' }}
                    value={wordingTranslations[key] || ''}
                    placeholder={`Translation for ${editingLocale}...`}
                    onChange={(e) => {
                      const updated = { ...wordingTranslations, [key]: e.target.value };
                      setWordingTranslations(updated);
                      setConfig({
                        ...config,
                        strings: {
                          ...config.strings,
                          [editingLocale]: updated,
                        },
                      });
                    }}
                  />
                </div>
              ))}
          </div>

          <button
            type="button"
            className="rl-btn rl-btn-primary"
            onClick={() => saveConfig(config)}
            disabled={saving}
          >
            {saving ? 'Saving...' : t('admin.save')}
          </button>
        </div>
      )}

      {/* TAB: ITEM RULES */}
      {activeTab === 'rules' && (
        <div className="rl-card">
          <h2 className="rl-card-title">{t('admin.rules')}</h2>

          {/* Locked Global Safety Rules */}
          <div style={{ padding: '0.75rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#991B1B', marginBottom: '0.25rem' }}>
              🔒 Global Safety Rules ({t('admin.locked')})
            </div>
            <ul style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.8125rem', color: '#7F1D1D' }}>
              <li>Swollen or damaged lithium battery prohibition</li>
              <li>Hazardous materials / chemicals exclusion</li>
              <li>Unidentified or unknown waste exclusion</li>
            </ul>
          </div>

          {/* Editable Tenant Rules */}
          <div className="rl-form-group">
            <label className="rl-label">Allowed Return Categories</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {(['ELECTRONICS', 'PACKAGING', 'RETURN'] as Category[]).map((cat) => {
                const checked = config.rules.allowedCategories?.includes(cat) ?? true;
                return (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const current = config.rules.allowedCategories || ['ELECTRONICS', 'PACKAGING', 'RETURN'];
                        const next = e.target.checked ? [...current, cat] : current.filter((c) => c !== cat);
                        setConfig({ ...config, rules: { ...config.rules, allowedCategories: next } });
                      }}
                    />
                    {cat}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="rl-form-group" style={{ marginBottom: 0 }}>
              <label className="rl-label">Max Item Size (Units)</label>
              <input
                type="number"
                min={1}
                max={5}
                className="rl-input"
                value={config.rules.maxSizeUnits || 2}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rules: { ...config.rules, maxSizeUnits: parseInt(e.target.value) || 1 },
                  })
                }
              />
            </div>

            <div className="rl-form-group" style={{ marginBottom: 0 }}>
              <label className="rl-label">Max Detour (km, max 1.5)</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                max={1.5}
                className="rl-input"
                value={config.rules.maxDetourKm || 1.5}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rules: { ...config.rules, maxDetourKm: Math.min(1.5, parseFloat(e.target.value) || 1.5) },
                  })
                }
              />
            </div>
          </div>

          {/* Excluded Keywords */}
          <div className="rl-form-group">
            <label className="rl-label">Excluded Description Keywords (comma-separated)</label>
            <input
              type="text"
              className="rl-input"
              value={config.rules.excludedKeywords?.join(', ') || ''}
              onChange={(e) =>
                setConfig({
                  ...config,
                  rules: {
                    ...config.rules,
                    excludedKeywords: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </div>

          <button
            type="button"
            className="rl-btn rl-btn-primary"
            onClick={() => saveConfig(config)}
            disabled={saving}
          >
            {saving ? 'Saving...' : t('admin.save')}
          </button>

          {/* Test a Sample Item Form */}
          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Test a Sample Item Against Active Rules
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <select className="rl-select" value={testCat} onChange={(e) => setTestCat(e.target.value as Category)}>
                <option value="ELECTRONICS">ELECTRONICS</option>
                <option value="PACKAGING">PACKAGING</option>
                <option value="RETURN">RETURN</option>
              </select>
              <select className="rl-select" value={testZone} onChange={(e) => setTestZone(e.target.value)}>
                {['A', 'B', 'C', 'D', 'E', 'F'].map((z) => (
                  <option key={z} value={z}>
                    Zone {z}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={5}
                className="rl-input"
                value={testSize}
                onChange={(e) => setTestSize(parseInt(e.target.value) || 1)}
              />
              <input
                type="text"
                placeholder="Description"
                className="rl-input"
                value={testDesc}
                onChange={(e) => setTestDesc(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="rl-btn rl-btn-secondary rl-btn-sm"
              onClick={async () => {
                const res = await api.checkEligibility({
                  category: testCat,
                  sizeUnits: testSize,
                  description: testDesc,
                  location: { zoneCode: testZone },
                });
                setTestResult(res);
              }}
            >
              Test Eligibility
            </button>
            {testResult && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  backgroundColor: testResult.decision === 'ELIGIBLE' ? '#ECFDF5' : '#FEF2F2',
                  color: testResult.decision === 'ELIGIBLE' ? '#065F46' : '#991B1B',
                  fontSize: '0.875rem',
                }}
              >
                Decision: <strong>{testResult.decision}</strong> {testResult.reasonCodes.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: DATA */}
      {activeTab === 'data' && (
        <div className="rl-card">
          <h2 className="rl-card-title">{t('admin.data')}</h2>
          <div style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>
            Data Mode: <strong>{config.dataMode}</strong>
          </div>
          <p style={{ color: '#4B5563', fontSize: '0.875rem' }}>
            In SIMULATED mode, delivery routes and partner consolidation hubs operate on seeded in-memory routes.
          </p>
          <div style={{ padding: '0.75rem', background: '#F3F4F6', borderRadius: '6px', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
            <div>Active Routes: Route R1 (north loop, free: 3), Route R2 (east run, free: 1), Route R3 (city centre, free: 0)</div>
            <div style={{ marginTop: '0.25rem' }}>Active Hubs: Demo hub (consolidation), Demo refurbisher, Demo reuse partner</div>
          </div>
        </div>
      )}

      {/* TAB: INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="rl-card">
          <h2 className="rl-card-title">{t('admin.integrations')}</h2>

          {createdSecret && (
            <div style={{ padding: '0.75rem', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '6px', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.875rem' }}>
                ✓ Webhook Created! Copy your secret now:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.375rem' }}>
                <code style={{ background: '#FFFFFF', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8125rem' }}>
                  {createdSecret}
                </code>
                <button
                  type="button"
                  className="rl-btn rl-btn-secondary rl-btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdSecret);
                    showToast('Secret copied to clipboard', 'info');
                  }}
                >
                  Copy Secret
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Active Webhooks</h3>
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{wh.url}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    Events: {wh.events.join(', ')}
                  </div>
                </div>
                <button
                  type="button"
                  className="rl-btn rl-btn-secondary rl-btn-sm"
                  style={{ color: '#DC2626' }}
                  onClick={async () => {
                    if (window.confirm('Delete this webhook?')) {
                      await api.deleteWebhook(wh.id);
                      setWebhooks((prev) => prev.filter((w) => w.id !== wh.id));
                      showToast('Webhook deleted', 'info');
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <h3 style={{ margin: 0, fontSize: '1rem', marginBottom: '0.5rem' }}>Register New Webhook</h3>
          <div className="rl-form-group">
            <label className="rl-label">Webhook URL</label>
            <input
              type="url"
              className="rl-input"
              placeholder="https://your-service.com/webhook"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
            />
          </div>

          <div className="rl-form-group">
            <label className="rl-label">Subscribed Events</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {[
                'item.registered',
                'item.matched',
                'item.collected',
                'item.received',
                'item.assessed',
                'item.outcome_recorded',
                'item.outcome_verified',
              ].map((ev) => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={newWebhookEvents.includes(ev)}
                    onChange={(e) => {
                      setNewWebhookEvents((prev) =>
                        e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev)
                      );
                    }}
                  />
                  {ev}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="rl-btn rl-btn-primary"
            onClick={async () => {
              if (!newWebhookUrl) return;
              const created = await api.createWebhook(newWebhookUrl, newWebhookEvents);
              setWebhooks((prev) => [...prev, created]);
              setCreatedSecret(created.secret || null);
              setNewWebhookUrl('');
              showToast('Webhook created', 'success');
            }}
          >
            Create Webhook
          </button>
        </div>
      )}

      {/* TAB: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="rl-card" style={{ marginBottom: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--rl-primary)' }}>{totalItems}</div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Total Items Processed</div>
            </div>
            <div className="rl-card" style={{ marginBottom: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#047857' }}>{verifiedRate}%</div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Evidence Verified Rate</div>
            </div>
            <div className="rl-card" style={{ marginBottom: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--rl-accent)' }}>0.8 km</div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Average Route Detour</div>
            </div>
          </div>

          <div className="rl-card">
            <h2 className="rl-card-title">Status Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {Object.entries(statusCounts).map(([st, cnt]) => (
                <div key={st} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ fontWeight: 600 }}>{st}</span>
                  <span>{cnt} items</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPage: React.FC = () => {
  return (
    <RequireRole requiredRole="ADMIN">
      <AdminContent />
    </RequireRole>
  );
};
