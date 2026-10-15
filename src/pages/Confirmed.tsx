import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api';
import { QrCard } from '../components/QrCard';
import { SkeletonCard } from '../components/Skeleton';
import { useI18n } from '../providers/I18nProvider';
import { Item } from '../types';

export const ConfirmedPage: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const { t } = useI18n();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const returnUrl = searchParams.get('returnUrl');

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;

    let isMounted = true;
    const fetchItem = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await api.getItem(itemId);
        if (isMounted) setItem(data);
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : t('common.error.generic'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchItem();
    return () => {
      isMounted = false;
    };
  }, [itemId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '540px', marginInline: 'auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (errorMsg || !item) {
    return (
      <div className="rl-card" style={{ maxWidth: '540px', marginInline: 'auto', textAlign: 'center' }}>
        <h2 style={{ color: '#991B1B', fontSize: '1.25rem' }}>{t('common.error.generic')}</h2>
        <p style={{ color: '#4B5563', fontSize: '0.9375rem' }}>{errorMsg || 'Item not found'}</p>
        <Link to="/launch" className="rl-btn rl-btn-primary" style={{ marginTop: '1rem' }}>
          {t('common.back')}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '540px', marginInline: 'auto' }}>
      <h1 className="no-print" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        {t('confirm.title')}
      </h1>

      {/* Printable and scannable QR card */}
      <QrCard
        passportUrl={item.passportUrl}
        publicId={item.publicId}
        returnUrl={returnUrl}
        onPrint={() => window.print()}
      />

      {/* 3 Next Steps */}
      <div className="rl-card no-print">
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, marginBottom: '1rem' }}>
          Next Steps:
        </h2>
        <ol style={{ margin: 0, paddingInlineStart: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <li style={{ fontSize: '0.9375rem', color: '#374151' }}>
            <strong>1. {t('confirm.next.1')}</strong>
          </li>
          <li style={{ fontSize: '0.9375rem', color: '#374151' }}>
            <strong>2. {t('confirm.next.2')}</strong>
          </li>
          <li style={{ fontSize: '0.9375rem', color: '#374151' }}>
            <strong>3. {t('confirm.next.3')}</strong>
          </li>
        </ol>

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <Link
            to={`/p/${item.publicId}`}
            className="rl-btn rl-btn-primary"
            style={{ width: '100%' }}
          >
            Open Live Item Passport &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
