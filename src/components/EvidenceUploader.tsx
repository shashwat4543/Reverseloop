import React, { useState } from 'react';
import { useI18n } from '../providers/I18nProvider';
import { Item } from '../types';

interface EvidenceUploaderProps {
  item: Item;
  onUpload: (photo?: File, reference?: string) => Promise<void>;
  disabled?: boolean;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({ item, onUpload, disabled }) => {
  const { t } = useI18n();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reference, setReference] = useState(item.reference || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds 5MB limit.');
      return;
    }

    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile && !reference.trim()) {
      setErrorMsg('Please select a photo or enter a reference number.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await onUpload(photoFile || undefined, reference.trim().slice(0, 120));
      setPhotoFile(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const photoComplete = Boolean(item.hasPhoto || photoFile);
  const refComplete = Boolean(item.reference || reference.trim());

  return (
    <div className="rl-card">
      <h3 className="rl-card-title">{t('hub.evidence')}</h3>
      <p className="rl-card-subtitle">
        Upload physical proof and tracking reference to verify item journey.
      </p>

      {/* Checklist of what is still needed */}
      <div style={{ marginBlock: '1rem', padding: '0.75rem', background: '#F3F4F6', borderRadius: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#374151' }}>
          {t('hub.missing')}:
        </div>
        <ul style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.875rem' }}>
          <li style={{ color: item.hasPhoto ? '#047857' : '#B45309' }}>
            {t('hub.photo')}: {item.hasPhoto ? '✓ Provided' : 'Missing'}
          </li>
          <li style={{ color: item.reference ? '#047857' : '#B45309' }}>
            {t('hub.reference')}: {item.reference ? `✓ (${item.reference})` : 'Missing'}
          </li>
        </ul>
      </div>

      {errorMsg && (
        <div
          role="alert"
          style={{
            color: '#B91C1C',
            background: '#FEE2E2',
            padding: '0.625rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rl-form-group">
          <label className="rl-label" htmlFor="evidence-photo">
            {t('hub.photo')} (JPEG, PNG, WebP &le; 5MB)
          </label>
          <input
            id="evidence-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="rl-input"
            onChange={handleFileChange}
            disabled={disabled || loading}
          />
          {previewUrl && (
            <div style={{ marginTop: '0.75rem' }}>
              <img
                src={previewUrl}
                alt="Evidence preview"
                style={{ maxHeight: '140px', borderRadius: '6px', border: '1px solid #E5E7EB' }}
              />
            </div>
          )}
        </div>

        <div className="rl-form-group">
          <label className="rl-label" htmlFor="evidence-reference">
            {t('hub.reference')} (max 120 characters)
          </label>
          <input
            id="evidence-reference"
            type="text"
            className="rl-input"
            placeholder="e.g. REF-2026-X812"
            maxLength={120}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={disabled || loading}
          />
        </div>

        <button
          type="submit"
          className="rl-btn rl-btn-primary"
          disabled={disabled || loading || (!photoComplete && !refComplete)}
        >
          {loading ? 'Uploading...' : 'Save Evidence'}
        </button>
      </form>
    </div>
  );
};
