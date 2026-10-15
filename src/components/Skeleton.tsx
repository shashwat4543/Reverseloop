import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#E5E7EB',
        animation: 'rl-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ...style,
      }}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="rl-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <Skeleton height="1.5rem" width="60%" />
      <Skeleton height="1rem" width="90%" />
      <Skeleton height="1rem" width="40%" />
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <Skeleton height="40px" width="100px" borderRadius="6px" />
        <Skeleton height="40px" width="80px" borderRadius="6px" />
      </div>
    </div>
  );
};
