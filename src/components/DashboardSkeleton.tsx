import Skeleton from './Skeleton';
import '../styles/animations.css';

export default function DashboardSkeleton() {
  return (
    <div style={{ padding: '60px 16px 16px', maxWidth: 480, margin: '0 auto' }}>
      <div className="status-bar" style={{ marginBottom: 24 }}>
        <Skeleton width={40} height={14} />
      </div>
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card" style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12,
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Skeleton width="60%" height={24} style={{ margin: '0 auto 4px' }} />
            <Skeleton width="80%" height={10} style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <Skeleton height={14} width={120} style={{ marginBottom: 12 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          marginBottom: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <Skeleton width={40} height={40} borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="30%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
