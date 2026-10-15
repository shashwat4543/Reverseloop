import React from 'react';
import { useI18n } from '../providers/I18nProvider';
import { MatchCandidate } from '../types';

interface CandidateTableProps {
  candidates: MatchCandidate[];
  selectedRouteId?: string | null;
}

export const CandidateTable: React.FC<CandidateTableProps> = ({ candidates, selectedRouteId }) => {
  const { t } = useI18n();

  return (
    <div className="rl-table-container">
      <table className="rl-table" aria-label="Route Candidates">
        <thead>
          <tr>
            <th scope="col">{t('match.route')}</th>
            <th scope="col">{t('match.spare')}</th>
            <th scope="col">{t('match.detour')}</th>
            <th scope="col">Status</th>
            <th scope="col">{t('match.score')}</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((cand) => {
            const isSelected = cand.routeId === selectedRouteId;
            const isOk = cand.capacityOk && cand.detourOk && cand.destinationOk;

            return (
              <tr
                key={cand.routeId}
                style={{
                  backgroundColor: isSelected ? 'rgba(139, 46, 22, 0.05)' : undefined,
                  fontWeight: isSelected ? 600 : undefined,
                }}
              >
                <td data-label={t('match.route')}>
                  <div>
                    {cand.routeName}
                    {isSelected && (
                      <span style={{ marginInlineStart: '0.5rem', color: 'var(--rl-primary)', fontSize: '0.8125rem' }}>
                        ★ Selected
                      </span>
                    )}
                  </div>
                </td>
                <td data-label={t('match.spare')}>{cand.spareUnits} units</td>
                <td data-label={t('match.detour')}>{cand.detourKm} km</td>
                <td data-label="Status">
                  {isOk ? (
                    <span className="rl-status-chip outcome_verified" style={{ fontSize: '0.75rem' }}>
                      Feasible
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {cand.failReasons.map((r) => (
                        <span
                          key={r}
                          className="rl-status-chip registered"
                          style={{
                            fontSize: '0.75rem',
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                          }}
                        >
                          {t(`match.fail.${r}` as any)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td data-label={t('match.score')}>
                  <span style={{ fontWeight: 700, color: cand.score > 0 ? 'var(--rl-primary)' : '#9CA3AF' }}>
                    {cand.score}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
