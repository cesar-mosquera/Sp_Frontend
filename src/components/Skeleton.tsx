import { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}
