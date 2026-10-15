import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../components/Toasts';
import { RequireRole } from '../providers/AuthProvider';
import { useI18n } from '../providers/I18nProvider';
import { ApiError, Item } from '../types';

export const DriverContent: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [manualIdInput, setManualIdInput] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.listItems('REGISTERED');
      setItems(res.items);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleScan = async () => {
    if ('BarcodeDetector' in window) {
      try {
        // BarcodeDetector supported - notify or prompt
        showToast('Camera scanner ready: scan QR code', 'info');
      } catch {
        setShowManualModal(true);
      }
    } else {
      setShowManualModal(true);
    }
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIdInput.trim()) return;
    try {
      setProcessing(true);
      const found = await api.getItem(manualIdInput.trim());
      setSelectedItem(found);
      setShowManualModal(false);
      setManualIdInput('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Item not found', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCollect = async (itemToCollect: Item) => {
    try {
      setProcessing(true);
      await api.postItemEvent(itemToCollect.id, { type: 'COLLECTED' });
      showToast(`Item ${itemToCollect.publicId} collected successfully!`, 'success');
      setSelectedItem(null);
      await fetchItems();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        showToast('Already collected', 'error');
      } else {
        showToast(err instanceof Error ? err.message : t('common.error.generic'), 'error');
      }
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = items.filter((it) =>
    it.publicId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '640px', marginInline: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>{t('driver.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="rl-btn rl-btn-primary rl-btn-sm" onClick={handleScan}>
            📷 {t('driver.scan')}
          </button>
          <button
            type="button"
            className="rl-btn rl-btn-secondary rl-btn-sm"
            onClick={() => setShowManualModal(true)}
          >
            ⌨️ {t('driver.manual')}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rl-form-group">
        <label htmlFor="driver-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Search items
        </label>
        <input
          id="driver-search"
          type="search"
          className="rl-input"
          placeholder="Search pickups by item ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading && <SkeletonCard />}

      {!loading && filteredItems.length === 0 && (
        <div className="rl-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
          <p style={{ margin: 0, color: '#4B5563' }}>{t('driver.empty')}</p>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rl-card"
              style={{
                marginBottom: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: '1.125rem' }}>
                  {item.publicId}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                  {t(`launch.category.${item.category.toLowerCase()}` as any)} • Stop pickup
                </div>
              </div>

              <button
                type="button"
                className="rl-btn rl-btn-primary rl-btn-sm"
                onClick={() => setSelectedItem(item)}
              >
                Inspect & Collect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem',
          }}
        >
          <div className="rl-card" style={{ maxWidth: '400px', width: '100%', margin: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', marginBottom: '1rem' }}>{t('driver.manual')}</h3>
            <form onSubmit={handleManualLookup}>
              <div className="rl-form-group">
                <input
                  type="text"
                  className="rl-input"
                  placeholder="e.g. RL-DEMO1"
                  value={manualIdInput}
                  onChange={(e) => setManualIdInput(e.target.value.toUpperCase())}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="rl-btn rl-btn-secondary"
                  onClick={() => setShowManualModal(false)}
                >
                  {t('common.back')}
                </button>
                <button type="submit" className="rl-btn rl-btn-primary" disabled={processing}>
                  Lookup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Sheet / Modal */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem',
          }}
        >
          <div className="rl-card" style={{ maxWidth: '440px', width: '100%', margin: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Confirm Pickup</h3>
            <p style={{ color: '#4B5563', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Confirm handing over item <strong>{selectedItem.publicId}</strong> into vehicle tote.
            </p>
            <div style={{ background: '#F3F4F6', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              <div><strong>Category:</strong> {selectedItem.category}</div>
              <div><strong>Status:</strong> {selectedItem.status}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="rl-btn rl-btn-secondary"
                onClick={() => setSelectedItem(null)}
                disabled={processing}
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                className="rl-btn rl-btn-primary"
                onClick={() => handleCollect(selectedItem)}
                disabled={processing}
              >
                {processing ? 'Processing...' : t('driver.collect')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DriverPage: React.FC = () => {
  return (
    <RequireRole requiredRole="DRIVER">
      <DriverContent />
    </RequireRole>
  );
};
