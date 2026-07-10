import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface BackendLog {
  type?: string;
  timestamp?: string;
}

interface Props {
  logs: BackendLog[];
}

const COLORS = ['#00f0ff', '#ff0033', '#00ff88', '#b300ff', '#ffcc00', '#ff00aa'];

function ChartsPanel({ logs }: Props) {
  const pieData = useMemo(() => {
    const appCounts: Record<string, number> = {};
    logs.forEach(log => {
      const t = (log.type || 'GENERAL').toUpperCase();
      appCounts[t] = (appCounts[t] || 0) + 1;
    });
    return Object.keys(appCounts)
      .map(key => ({ name: key, value: appCounts[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 apps
  }, [logs]);

  const barData = useMemo(() => {
    const dateCounts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.timestamp) {
        const date = log.timestamp.split('T')[0]; // YYYY-MM-DD
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });
    return Object.keys(dateCounts)
      .sort()
      .slice(-7) // Last 7 days
      .map(date => ({
        date: date.substring(5), // MM-DD
        operaciones: dateCounts[date],
      }));
  }, [logs]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', padding: '16px' }}>
      
      {/* Bar Chart */}
      <div style={{ background: 'rgba(10, 0, 20, 0.4)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(179, 0, 255, 0.2)' }}>
        <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.8rem', color: '#00f0ff', marginBottom: '16px' }}>Operaciones (Últimos 7 días)</h3>
        <div style={{ height: 250 }}>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(0, 240, 255, 0.1)' }}
                  contentStyle={{ backgroundColor: '#0a0014', border: '1px solid #00f0ff', borderRadius: '8px' }}
                />
                <Bar dataKey="operaciones" fill="#00f0ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
              Sin datos suficientes
            </div>
          )}
        </div>
      </div>

      {/* Pie Chart */}
      <div style={{ background: 'rgba(10, 0, 20, 0.4)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(179, 0, 255, 0.2)' }}>
        <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: '0.8rem', color: '#b300ff', marginBottom: '16px' }}>Distribución por Plataforma</h3>
        <div style={{ height: 250 }}>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0a0014', border: '1px solid #b300ff', borderRadius: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontFamily: "'Inter', sans-serif" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
              Sin datos suficientes
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default React.memo(ChartsPanel);
