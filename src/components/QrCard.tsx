import { QRCodeSVG } from 'qrcode.react';
import React, { useState } from 'react';
import { useI18n } from '../providers/I18nProvider';

interface QrCardProps {
  passportUrl: string;
  publicId: string;
  onPrint?: () => void;
  returnUrl?: string | null;
}

export const QrCard: React.FC<QrCardProps> = ({ passportUrl, publicId, onPrint, returnUrl }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="rl-card" style={{ textAlign: 'center', padding: '1.75rem' }}>
      <div style={{ display: 'inline-block', padding: '1rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '1rem' }}>
        <QRCodeSVG
          value={passportUrl}
          size={180}
          level="M"
          aria-label={`Passport QR code for item ${publicId}`}
        />
      </div>

      <div style={{ marginBlock: '0.5rem' }}>
        <span
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            padding: '0.25rem 0.75rem',
            background: '#F3F4F6',
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          {publicId}
        </span>
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className="rl-btn rl-btn-secondary rl-btn-sm no-print"
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : t('confirm.copy')}
        </button>
        <button
          type="button"
          className="rl-btn rl-btn-secondary rl-btn-sm no-print"
          onClick={handlePrint}
        >
          {t('confirm.print')}
        </button>
      </div>

      {returnUrl && (
        <div style={{ marginTop: '1rem' }} className="no-print">
          <a href={returnUrl} className="rl-btn rl-btn-ghost rl-btn-sm">
            {t('confirm.back')}
          </a>
        </div>
      )}
    </div>
  );
};
