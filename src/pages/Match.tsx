import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { CandidateTable } from '../components/CandidateTable';
import { SkeletonCard } from '../components/Skeleton';
import { useI18n } from '../providers/I18nProvider';
import { useTenant } from '../providers/TenantProvider';
import { ApiError, CollectionRequest, CollectionRequestCreate } from '../types';

export const MatchPage: React.FC = () => {
  const { t } = useI18n();
  const { config } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();

  const requestData = (location.state as { requestData?: CollectionRequestCreate })?.requestData;

  const [loading, setLoading] = useState(true);
  const [collectionRequest, setCollectionRequest] = useState<CollectionRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Maintain stable idempotency key across retries
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const executeMatch = async () => {
    if (!requestData) {
      navigate('/launch');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.createCollectionRequest(requestData, idempotencyKeyRef.current);
      setCollectionRequest(res);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 422) {
        // Go back to launch with reasons
        navigate('/launch', { state: { errorReason: err.message } });
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : t('common.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeMatch();
  }, []);

  return (
    <div style={{ maxWidth: '680px', marginInline: 'auto' }}>
      <h1>{loading ? t('match.finding') : collectionRequest?.matched ? t('match.booked') : t('match.finding')}</h1>

      {loading && (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ color: '#4B5563', marginBottom: '1rem' }}>
            Matching spare vehicle capacity along your delivery route...
          </p>
          <SkeletonCard />
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rl-card"
          style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }}
        >
          <h2 style={{ fontSize: '1.125rem', color: '#991B1B', marginBottom: '0.5rem' }}>
            {t('common.error.generic')}
          </h2>
          <p style={{ color: '#7F1D1D', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {errorMsg}
          </p>
          <button
            type="button"
            className="rl-btn rl-btn-primary"
            onClick={executeMatch}
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && collectionRequest && (
        <>
          {collectionRequest.matched ? (
            <div className="rl-card" style={{ backgroundColor: '#ECFDF5', borderColor: '#6EE7B7', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '1.75rem' }}>🎉</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#065F46' }}>
                    {t('match.booked')}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#047857' }}>
                    Route matched: <strong>{collectionRequest.selectedRouteId}</strong> (Detour: {collectionRequest.detourKm} km)
                  </p>
                </div>
              </div>

              {collectionRequest.destinationHub && (
                <div style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '1rem' }}>
                  Target Destination: <strong>{collectionRequest.destinationHub}</strong>
                </div>
              )}

              {collectionRequest.item && (
                <button
                  type="button"
                  className="rl-btn rl-btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/confirmed/${collectionRequest.item!.id}`)}
                >
                  View Passport & Label &rarr;
                </button>
              )}
            </div>
          ) : (
            <div className="rl-card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⚠️</div>
              <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#92400E', marginBottom: '0.5rem' }}>
                {t('match.none')}
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="rl-btn rl-btn-secondary"
                  onClick={() => navigate('/launch')}
                >
                  {t('match.retry')}
                </button>
                {config?.dropoffUrl && (
                  <a
                    href={config.dropoffUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rl-btn rl-btn-primary"
                  >
                    {t('match.dropoff')}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Candidate Table */}
          <div className="rl-card">
            <h2 className="rl-card-title">Evaluated Delivery Routes</h2>
            <p className="rl-card-subtitle">
              Spare capacity and detour feasibility evaluated across ongoing delivery routes.
            </p>
            <CandidateTable
              candidates={collectionRequest.candidates}
              selectedRouteId={collectionRequest.selectedRouteId}
            />
          </div>
        </>
      )}
    </div>
  );
};
