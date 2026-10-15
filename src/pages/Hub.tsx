import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { EvidenceUploader } from '../components/EvidenceUploader';
import { SkeletonCard } from '../components/Skeleton';
import { StatusChip } from '../components/StatusChip';
import { Timeline } from '../components/Timeline';
import { useToast } from '../components/Toasts';
import { RequireRole } from '../providers/AuthProvider';
import { useI18n } from '../providers/I18nProvider';
import { Category, Item, Outcome } from '../types';

type HubTab = 'intake' | 'assess' | 'outcome';

export const HubContent: React.FC = () => {
  const { itemId } = useParams<{ itemId?: string }>();
  const { t } = useI18n();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<HubTab>('intake');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form states for assessment
  const [assessmentForms, setAssessmentForms] = useState<Record<string, { condition: string; destination: string }>>({});
  // Form states for outcome
  const [outcomeForms, setOutcomeForms] = useState<Record<string, { outcome: Outcome }>>({});

  // Detail view state if itemId is specified
  const [detailItem, setDetailItem] = useState<Item | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      if (itemId) {
        const item = await api.getItem(itemId);
        setDetailItem(item);
      } else {
        const res = await api.listItems();
        setItems(res.items);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [itemId]);

  // Intake: Mark RECEIVED
  const handleIntake = async (id: string) => {
    try {
      setProcessing(true);
      await api.postItemEvent(id, { type: 'RECEIVED' });
      showToast('Item received at consolidation hub', 'success');
      await fetchItems();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Assessment: Post ASSESSED
  const handleAssess = async (id: string, cat: Category) => {
    const form = assessmentForms[id] || { condition: 'Good', destination: getDestinationOptions(cat)[0] };
    if (!form.condition || !form.destination) {
      showToast('Please select condition and destination', 'error');
      return;
    }

    try {
      setProcessing(true);
      await api.postItemEvent(id, {
        type: 'ASSESSED',
        condition: form.condition,
        recommendedDestination: form.destination,
      });
      showToast('Item assessment recorded', 'success');
      await fetchItems();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Outcome: Post OUTCOME
  const handleOutcome = async (id: string, cat: Category) => {
    const form = outcomeForms[id] || { outcome: getOutcomeOptions(cat)[0] };
    if (!form.outcome) {
      showToast('Please select an outcome', 'error');
      return;
    }

    try {
      setProcessing(true);
      await api.postItemEvent(id, {
        type: 'OUTCOME',
        outcome: form.outcome,
      });
      showToast('Outcome recorded successfully', 'success');
      await fetchItems();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Upload Evidence
  const handleUploadEvidence = async (photo?: File, reference?: string) => {
    if (!detailItem) return;
    try {
      const updated = await api.uploadEvidence(detailItem.id, photo, reference);
      setDetailItem(updated);
      showToast('Evidence saved successfully!', 'success');
      if (updated.verified) {
        showToast('Item journey fully verified!', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
  };

  function getDestinationOptions(cat: Category): string[] {
    switch (cat) {
      case 'ELECTRONICS':
        return ['Repair', 'Refurbish', 'Reuse or resale', 'Authorized recycling'];
      case 'PACKAGING':
        return ['Clean and return to circulation'];
      case 'RETURN':
        return ['Return to seller', 'Reuse or resale'];
    }
  }

  function getOutcomeOptions(cat: Category): Outcome[] {
    switch (cat) {
      case 'ELECTRONICS':
        return ['REPAIRED', 'REFURBISHED', 'REUSED_RESOLD', 'AUTHORIZED_RECYCLING'];
      case 'PACKAGING':
        return ['PACKAGING_RECIRCULATED'];
      case 'RETURN':
        return ['RETURNED_TO_SELLER', 'REUSED_RESOLD'];
    }
  }

  // If viewing single item detail
  if (itemId && detailItem) {
    return (
      <div style={{ maxWidth: '640px', marginInline: 'auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/hub" className="rl-btn rl-btn-secondary rl-btn-sm">
            &larr; Back to Hub Queue
          </Link>
        </div>

        <div className="rl-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'ui-monospace, monospace' }}>
              {detailItem.publicId}
            </h1>
            <StatusChip status={detailItem.status} />
          </div>
          <div style={{ color: '#4B5563', fontSize: '0.875rem' }}>
            Category: <strong>{detailItem.category}</strong>
          </div>
          {detailItem.condition && (
            <div style={{ color: '#4B5563', fontSize: '0.875rem' }}>
              Condition: <strong>{detailItem.condition}</strong>
            </div>
          )}
          {detailItem.recommendedDestination && (
            <div style={{ color: '#4B5563', fontSize: '0.875rem' }}>
              Destination: <strong>{detailItem.recommendedDestination}</strong>
            </div>
          )}
          {detailItem.outcome && (
            <div style={{ color: '#047857', fontSize: '0.875rem' }}>
              Outcome: <strong>{t(`outcome.${detailItem.outcome}` as any)}</strong>
            </div>
          )}
          <div style={{ marginTop: '0.75rem' }}>
            {detailItem.verified ? (
              <span className="rl-status-chip outcome_verified">
                ✓ {t('passport.verified')}
              </span>
            ) : (
              <span className="rl-status-chip registered">
                ⏳ {t('passport.unverified')}
              </span>
            )}
          </div>
        </div>

        {/* Evidence Uploader */}
        <EvidenceUploader item={detailItem} onUpload={handleUploadEvidence} disabled={processing} />

        {/* Timeline */}
        <div className="rl-card">
          <h2 className="rl-card-title">Item History</h2>
          <Timeline
            entries={detailItem.events.map((e) => ({
              stage: e.type,
              at: e.at,
              placeName: e.placeName,
              note: e.note,
            }))}
          />
        </div>
      </div>
    );
  }

  // Filter items by current tab
  const intakeList = items.filter((i) => i.status === 'COLLECTED');
  const assessList = items.filter((i) => i.status === 'RECEIVED');
  const outcomeList = items.filter((i) => i.status === 'ASSESSED');

  return (
    <div style={{ maxWidth: '720px', marginInline: 'auto' }}>
      <h1>Hub Operations Portal</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`rl-btn rl-btn-sm ${activeTab === 'intake' ? 'rl-btn-primary' : 'rl-btn-ghost'}`}
          onClick={() => setActiveTab('intake')}
        >
          {t('hub.intake')} ({intakeList.length})
        </button>
        <button
          type="button"
          className={`rl-btn rl-btn-sm ${activeTab === 'assess' ? 'rl-btn-primary' : 'rl-btn-ghost'}`}
          onClick={() => setActiveTab('assess')}
        >
          {t('hub.assess')} ({assessList.length})
        </button>
        <button
          type="button"
          className={`rl-btn rl-btn-sm ${activeTab === 'outcome' ? 'rl-btn-primary' : 'rl-btn-ghost'}`}
          onClick={() => setActiveTab('outcome')}
        >
          {t('hub.outcome')} ({outcomeList.length})
        </button>
      </div>

      {loading && <SkeletonCard />}

      {/* TAB 1: Intake (COLLECTED -> RECEIVED) */}
      {!loading && activeTab === 'intake' && (
        <div>
          {intakeList.length === 0 ? (
            <div className="rl-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ margin: 0, color: '#4B5563' }}>No collected items waiting for intake dock scan.</p>
            </div>
          ) : (
            intakeList.map((item) => (
              <div key={item.id} className="rl-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '1.125rem' }}>
                    <Link to={`/hub/${item.id}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {item.publicId}
                    </Link>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                    {item.category} • Collected from route
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="rl-btn rl-btn-primary rl-btn-sm"
                    onClick={() => handleIntake(item.id)}
                    disabled={processing}
                  >
                    Mark Received
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Assessment (RECEIVED -> ASSESSED) */}
      {!loading && activeTab === 'assess' && (
        <div>
          {assessList.length === 0 ? (
            <div className="rl-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ margin: 0, color: '#4B5563' }}>No items pending assessment.</p>
            </div>
          ) : (
            assessList.map((item) => {
              const destOptions = getDestinationOptions(item.category);
              const currentForm = assessmentForms[item.id] || { condition: 'Good', destination: destOptions[0] };

              return (
                <div key={item.id} className="rl-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '1.125rem' }}>
                      <Link to={`/hub/${item.id}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                        {item.publicId}
                      </Link>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>{item.category}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="rl-label" style={{ fontSize: '0.8125rem' }}>
                        {t('hub.condition')}
                      </label>
                      <select
                        className="rl-select"
                        value={currentForm.condition}
                        onChange={(e) =>
                          setAssessmentForms((prev) => ({
                            ...prev,
                            [item.id]: { ...currentForm, condition: e.target.value },
                          }))
                        }
                      >
                        <option value="Good">Good</option>
                        <option value="Needs repair">Needs repair</option>
                        <option value="Not repairable">Not repairable</option>
                      </select>
                    </div>

                    <div>
                      <label className="rl-label" style={{ fontSize: '0.8125rem' }}>
                        {t('hub.destination')}
                      </label>
                      <select
                        className="rl-select"
                        value={currentForm.destination}
                        onChange={(e) =>
                          setAssessmentForms((prev) => ({
                            ...prev,
                            [item.id]: { ...currentForm, destination: e.target.value },
                          }))
                        }
                      >
                        {destOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Link to={`/hub/${item.id}`} className="rl-btn rl-btn-secondary rl-btn-sm">
                      Upload Evidence
                    </Link>
                    <button
                      type="button"
                      className="rl-btn rl-btn-primary rl-btn-sm"
                      onClick={() => handleAssess(item.id, item.category)}
                      disabled={processing}
                    >
                      Save Assessment
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: Outcome (ASSESSED -> OUTCOME) */}
      {!loading && activeTab === 'outcome' && (
        <div>
          {outcomeList.length === 0 ? (
            <div className="rl-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ margin: 0, color: '#4B5563' }}>No items pending next-life outcome recording.</p>
            </div>
          ) : (
            outcomeList.map((item) => {
              const outcomeOptions = getOutcomeOptions(item.category);
              const currentForm = outcomeForms[item.id] || { outcome: outcomeOptions[0] };

              return (
                <div key={item.id} className="rl-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '1.125rem' }}>
                      <Link to={`/hub/${item.id}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                        {item.publicId}
                      </Link>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      {item.category} • Condition: {item.condition}
                    </span>
                  </div>

                  <div className="rl-form-group" style={{ marginBottom: '1rem' }}>
                    <label className="rl-label" style={{ fontSize: '0.8125rem' }}>
                      {t('hub.outcome')}
                    </label>
                    <select
                      className="rl-select"
                      value={currentForm.outcome}
                      onChange={(e) =>
                        setOutcomeForms((prev) => ({
                          ...prev,
                          [item.id]: { outcome: e.target.value as Outcome },
                        }))
                      }
                    >
                      {outcomeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {t(`outcome.${opt}` as any)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', color: item.verified ? '#047857' : '#B45309' }}>
                      {item.verified ? '✓ Verified' : 'Evidence needed for verification'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link to={`/hub/${item.id}`} className="rl-btn rl-btn-secondary rl-btn-sm">
                        Evidence / Details
                      </Link>
                      <button
                        type="button"
                        className="rl-btn rl-btn-primary rl-btn-sm"
                        onClick={() => handleOutcome(item.id, item.category)}
                        disabled={processing}
                      >
                        Record Outcome
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const HubPage: React.FC = () => {
  return (
    <RequireRole requiredRole="HUB">
      <HubContent />
    </RequireRole>
  );
};
