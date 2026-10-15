import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../providers/I18nProvider';
import { useTenant } from '../providers/TenantProvider';
import { Category, EligibilityResult, ReasonCode } from '../types';

export const LaunchPage: React.FC = () => {
  const { t } = useI18n();
  const { config } = useTenant();
  const navigate = useNavigate();

  const [category, setCategory] = useState<Category>('ELECTRONICS');
  const [zone, setZone] = useState<string>('A');
  const [size, setSize] = useState<number>(1);
  const [description, setDescription] = useState<string>('');

  // Three yes/no questions
  const [batteryDamaged, setBatteryDamaged] = useState<boolean | null>(null);
  const [hazardousMaterial, setHazardousMaterial] = useState<boolean | null>(null);
  const [unknownWaste, setUnknownWaste] = useState<boolean | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const allQuestionsAnswered =
    batteryDamaged !== null && hazardousMaterial !== null && unknownWaste !== null;

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allQuestionsAnswered) return;

    try {
      setIsChecking(true);
      setGeneralError(null);
      const res = await api.checkEligibility({
        category,
        sizeUnits: size,
        description: description.trim() || undefined,
        location: { zoneCode: zone },
        flags: {
          swollenOrDamagedBattery: batteryDamaged === true,
          hazardousMaterial: hazardousMaterial === true,
          unknownWaste: unknownWaste === true,
        },
      });
      setEligibilityResult(res);
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : t('common.error.generic'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleFindPickup = () => {
    // Navigate to /match with state
    navigate('/match', {
      state: {
        requestData: {
          category,
          sizeUnits: size,
          description: description.trim() || undefined,
          location: { zoneCode: zone },
          flags: {
            swollenOrDamagedBattery: batteryDamaged === true,
            hazardousMaterial: hazardousMaterial === true,
            unknownWaste: unknownWaste === true,
          },
        },
      },
    });
  };

  return (
    <div style={{ maxWidth: '640px', marginInline: 'auto' }}>
      <h1>{t('launch.title')}</h1>

      <form onSubmit={handleCheckEligibility}>
        {/* Category Radio Group */}
        <fieldset className="rl-card" style={{ border: 'none', padding: 0 }}>
          <legend className="rl-label" style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
            Item Category
          </legend>
          <div className="rl-radio-card-grid" role="radiogroup" aria-label="Item Category">
            <button
              type="button"
              role="radio"
              aria-checked={category === 'ELECTRONICS'}
              className={`rl-radio-card ${category === 'ELECTRONICS' ? 'active' : ''}`}
              onClick={() => {
                setCategory('ELECTRONICS');
                setEligibilityResult(null);
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📱</div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t('launch.category.electronics')}</div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={category === 'PACKAGING'}
              className={`rl-radio-card ${category === 'PACKAGING' ? 'active' : ''}`}
              onClick={() => {
                setCategory('PACKAGING');
                setEligibilityResult(null);
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📦</div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t('launch.category.packaging')}</div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={category === 'RETURN'}
              className={`rl-radio-card ${category === 'RETURN' ? 'active' : ''}`}
              onClick={() => {
                setCategory('RETURN');
                setEligibilityResult(null);
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🛍️</div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t('launch.category.return')}</div>
            </button>
          </div>
        </fieldset>

        {/* Zone & Size Stepper */}
        <div className="rl-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="rl-form-group" style={{ marginBottom: 0 }}>
              <label className="rl-label" htmlFor="delivery-zone">
                {t('launch.zone')}
              </label>
              <select
                id="delivery-zone"
                value={zone}
                onChange={(e) => {
                  setZone(e.target.value);
                  setEligibilityResult(null);
                }}
                className="rl-select"
              >
                {['A', 'B', 'C', 'D', 'E', 'F'].map((z) => (
                  <option key={z} value={z}>
                    Zone {z}
                  </option>
                ))}
              </select>
            </div>

            <div className="rl-form-group" style={{ marginBottom: 0 }}>
              <label className="rl-label" htmlFor="item-size">
                {t('launch.size')} (units)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="rl-btn rl-btn-secondary"
                  style={{ width: '44px', padding: 0 }}
                  onClick={() => {
                    setSize((s) => Math.max(1, s - 1));
                    setEligibilityResult(null);
                  }}
                  disabled={size <= 1}
                  aria-label="Decrease size"
                >
                  -
                </button>
                <span
                  id="item-size"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '1.125rem',
                  }}
                >
                  {size}
                </span>
                <button
                  type="button"
                  className="rl-btn rl-btn-secondary"
                  style={{ width: '44px', padding: 0 }}
                  onClick={() => {
                    setSize((s) => Math.min(2, s + 1));
                    setEligibilityResult(null);
                  }}
                  disabled={size >= 2}
                  aria-label="Increase size"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rl-form-group" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="rl-label" htmlFor="item-desc">
                {t('launch.description')}
              </label>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {description.length}/200
              </span>
            </div>
            <textarea
              id="item-desc"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value.slice(0, 200));
                setEligibilityResult(null);
              }}
              maxLength={200}
              className="rl-textarea"
              placeholder="e.g. Broken kettle, clean return packaging, or unopened jacket"
            />
          </div>
        </div>

        {/* Safety Questions */}
        <div className="rl-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Safety and Verification
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Question 1: Battery */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9375rem', flex: 1, minWidth: '200px' }}>
                {t('launch.flag.battery')}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`rl-btn rl-btn-sm ${batteryDamaged === true ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                  onClick={() => {
                    setBatteryDamaged(true);
                    setEligibilityResult(null);
                  }}
                >
                  {t('launch.yes')}
                </button>
                <button
                  type="button"
                  className={`rl-btn rl-btn-sm ${batteryDamaged === false ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                  onClick={() => {
                    setBatteryDamaged(false);
                    setEligibilityResult(null);
                  }}
                >
                  {t('launch.no')}
                </button>
              </div>
            </div>

            {/* Question 2: Hazard */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9375rem', flex: 1, minWidth: '200px' }}>
                {t('launch.flag.hazard')}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`rl-btn rl-btn-sm ${hazardousMaterial === true ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                  onClick={() => {
                    setHazardousMaterial(true);
                    setEligibilityResult(null);
                  }}
                >
                  {t('launch.yes')}
                </button>
                <button
                  type="button"
                  className={`rl-btn rl-btn-sm ${hazardousMaterial === false ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                  onClick={() => {
                    setHazardousMaterial(false);
                    setEligibilityResult(null);
                  }}
                >
                  {t('launch.no')}
                </button>
              </div>
            </div>

            {/* Question 3: Unsure */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9375rem', flex: 1, minWidth: '200px' }}>
                {t('launch.flag.unknown')}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`rl-btn rl-btn-sm ${unknownWaste === true ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                  onClick={() => {
                    setUnknownWaste(true);
                    setEligibilityResult(null);
                  }}
                >
                  {t('launch.yes')}
                </button>
                <button
                  type="button"
                  className={`rl-btn rl-btn-sm ${unknownWaste === false ? 'rl-btn-primary' : 'rl-btn-secondary'}`}
                  onClick={() => {
                    setUnknownWaste(false);
                    setEligibilityResult(null);
                  }}
                >
                  {t('launch.no')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {generalError && (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {generalError}
          </div>
        )}

        {/* Check Eligibility Button */}
        {!eligibilityResult && (
          <button
            type="submit"
            className="rl-btn rl-btn-primary"
            style={{ width: '100%' }}
            disabled={!allQuestionsAnswered || isChecking}
          >
            {isChecking ? 'Checking...' : t('launch.check')}
          </button>
        )}

        {/* Result Region with aria-live="polite" */}
        <div aria-live="polite" style={{ marginTop: '1rem' }}>
          {eligibilityResult?.decision === 'REJECTED' && (
            <div
              className="rl-card"
              style={{
                backgroundColor: '#FEF2F2',
                borderColor: '#FCA5A5',
              }}
            >
              <h3 style={{ color: '#991B1B', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                {t('elig.rejected')}
              </h3>
              <ul style={{ margin: 0, paddingInlineStart: '1.25rem', color: '#7F1D1D', fontSize: '0.9375rem' }}>
                {eligibilityResult.reasonCodes.map((code: ReasonCode) => (
                  <li key={code} style={{ marginBottom: '0.25rem' }}>
                    {t(`elig.reason.${code}` as any)}
                  </li>
                ))}
              </ul>
              {config?.dropoffUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <a
                    href={config.dropoffUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rl-btn rl-btn-secondary rl-btn-sm"
                  >
                    {t('match.dropoff')}
                  </a>
                </div>
              )}
            </div>
          )}

          {eligibilityResult?.decision === 'ELIGIBLE' && (
            <div
              className="rl-card"
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#6EE7B7',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>✅</div>
              <h3 style={{ color: '#065F46', fontSize: '1.125rem', marginBottom: '0.75rem' }}>
                {t('elig.ok')}
              </h3>
              <button
                type="button"
                className="rl-btn rl-btn-primary"
                style={{ width: '100%' }}
                onClick={handleFindPickup}
              >
                {t('launch.find')}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
