import React from 'react';
import { useI18n } from '../providers/I18nProvider';
import { ItemStatus } from '../types';

interface StatusChipProps {
  status: ItemStatus;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const { t } = useI18n();

  const getLabel = () => {
    switch (status) {
      case 'REGISTERED':
        return t('stage.REGISTERED');
      case 'COLLECTED':
        return t('stage.COLLECTED');
      case 'RECEIVED':
        return t('stage.RECEIVED');
      case 'ASSESSED':
        return t('stage.ASSESSED');
      case 'OUTCOME_RECORDED':
        return t('stage.OUTCOME');
      case 'OUTCOME_VERIFIED':
        return `${t('stage.OUTCOME')} (Verified)`;
      default:
        return status;
    }
  };

  const statusClass = status.toLowerCase();

  return (
    <span className={`rl-status-chip ${statusClass}`}>
      {getLabel()}
    </span>
  );
};
