import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { SkeletonCard } from '../components/Skeleton';
import { StatusChip } from '../components/StatusChip';
import { Timeline } from '../components/Timeline';
import { useI18n } from '../providers/I18nProvider';
import { ApiError, PublicItem } from '../types';

export const PassportPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const { t } = useI18n();

  const [item, setItem] = useState<PublicItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPublicItem = async (isBackground = false) => {
    if (!publicId) return;
    try {
      if (!isBackground) setLoading(true);
      setErrorMsg(null);
      setNotFound(false);
      const data = await api.getPublicItem(publicId);
      setItem(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setErrorMsg(err instanceof Error ? err.message : t('common.error.generic'));
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicItem();

    // Refetch every 30 s while document is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPublicItem(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [publicId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '600px', marginInline: 'auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rl-card" style={{ maxWidth: '540px', marginInline: 'auto', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
        <h2 style={{ fontSize: '1.25rem', color: '#991B1B', marginBottom: '0.5rem' }}>
          {t('passport.invalid')}
        </h2>
        <p style={{ color: '#4B5563', fontSize: '0.9375rem' }}>
          No item was found for identifier &ldquo;{publicId}&rdquo;. Please verify your QR code or tracking link.
        </p>
      </div>
    );
  }

  if (errorMsg || !item) {
    return (
      <div className="rl-card" style={{ maxWidth: '540px', marginInline: 'auto', textAlign: 'center' }}>
        <h2 style={{ color: '#991B1B', fontSize: '1.25rem' }}>{t('common.error.generic')}</h2>
        <p style={{ color: '#4B5563', fontSize: '0.9375rem' }}>{errorMsg}</p>
        <button type="button" className="rl-btn rl-btn-primary" onClick={() => fetchPublicItem()}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', marginInline: 'auto' }}>
      {/* Promise & Header */}
      <div className="rl-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B7280', marginBottom: '0.25rem' }}>
          ReverseLoop Digital Passport
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontFamily: 'ui-monospace, monospace' }}>
          {item.publicId}
        </h1>
        <p style={{ color: '#4B5563', fontSize: '0.9375rem', margin: 0, fontStyle: 'italic' }}>
          &ldquo;{t('passport.promise')}&rdquo;
        </p>

        {/* Verification Badge */}
        <div style={{ marginTop: '1rem' }}>
          {item.verified ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                backgroundColor: '#DEF7EC',
                color: '#03543F',
                padding: '0.375rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              <span>🛡️</span>
              <span>{t('passport.verified')}</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                padding: '0.375rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              <span>⏳</span>
              <span>{t('passport.unverified')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Item Summary Card */}
      <div className="rl-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', color: '#6B7280', display: 'block' }}>Category</span>
            <strong style={{ fontSize: '1rem' }}>
              {t(`launch.category.${item.category.toLowerCase()}` as any)}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '0.8125rem', color: '#6B7280', display: 'block' }}>Current Status</span>
            <StatusChip status={item.status} />
          </div>
        </div>

        {item.outcome && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '0.8125rem', color: '#6B7280', display: 'block' }}>Next-Life Outcome</span>
            <strong style={{ color: '#047857', fontSize: '1rem' }}>
              ✓ {t(`outcome.${item.outcome}` as any)}
            </strong>
          </div>
        )}
      </div>

      {/* Vertical 5-Stage Journey Timeline */}
      <div className="rl-card">
        <h2 className="rl-card-title">Reverse Journey Timeline</h2>
        <Timeline entries={item.timeline} />
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#6B7280', marginTop: '1rem' }}>
        {t('passport.privacy')}
      </div>
    </div>
  );
};
