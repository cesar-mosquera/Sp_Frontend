import Skeleton from './Skeleton';
import '../styles/animations.css';

export default function AdminSkeleton() {
  return (
    <div style={{ padding: '60px 16px 16px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Skeleton width={180} height={24} />
        <Skeleton width={80} height={32} borderRadius={14} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12,
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Skeleton width="60%" height={24} style={{ margin: '0 auto 4px' }} />
            <Skeleton width="80%" height={10} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <Skeleton height={14} width={160} style={{ marginBottom: 12 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          padding: 16, marginBottom: 8,
          background: 'rgba(255,255,255,0.03)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <Skeleton width="40%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={12} style={{ marginBottom: 4 }} />
          <Skeleton width="30%" height={12} />
        </div>
      ))}
    </div>
  );
}
