import React from 'react';
import { useI18n } from '../providers/I18nProvider';

export interface TimelineEntry {
  stage: string;
  at?: string;
  placeName?: string;
  note?: string;
}

interface TimelineProps {
  entries: TimelineEntry[];
}

const ALL_STAGES = ['REGISTERED', 'COLLECTED', 'RECEIVED', 'ASSESSED', 'OUTCOME'];

export const Timeline: React.FC<TimelineProps> = ({ entries }) => {
  const { t, locale } = useI18n();

  const entriesMap = new Map<string, TimelineEntry>();
  entries.forEach((e) => {
    entriesMap.set(e.stage, e);
  });

  return (
    <div className="rl-timeline" role="list">
      {ALL_STAGES.map((stage) => {
        const entry = entriesMap.get(stage);
        const isDone = Boolean(entry);
        const stageLabel = t(`stage.${stage}`);

        let formattedTime = '';
        if (entry?.at) {
          try {
            formattedTime = new Intl.DateTimeFormat(locale === 'en-XA' ? 'en' : locale, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(entry.at));
          } catch {
            formattedTime = entry.at;
          }
        }

        return (
          <div
            key={stage}
            role="listitem"
            className={`rl-timeline-item ${isDone ? 'done' : 'pending'}`}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{stageLabel}</div>
            {isDone && (
              <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.125rem' }}>
                {formattedTime && <span>{formattedTime}</span>}
                {entry?.placeName && <span> • {entry.placeName}</span>}
                {entry?.note && <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>{entry.note}</div>}
              </div>
            )}
            {!isDone && (
              <div style={{ fontSize: '0.8125rem', color: '#9ca3af', marginTop: '0.125rem' }}>
                Pending
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
