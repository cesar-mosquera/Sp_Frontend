import { useState } from 'react';
import { useAuthStore } from '../store';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const login = useAuthStore(s => s.login);

  const doLogin = () => {
    const trimmedPass = password.trim();
    login(trimmedPass);
    if (trimmedPass !== '0504319310_cesar') {
      setError(true);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0014', padding: 40, textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔐</div>
      <h1 style={{
        fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', fontWeight: 700,
        background: 'linear-gradient(135deg, #ffffff, #d5a6ff)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text', marginBottom: 8,
      }}>
        Acceso Administrador
      </h1>
      <p style={{ color: '#a580c7', fontSize: '0.85rem', marginBottom: 32 }}>
        Ingresa la clave maestra para gestionar dispositivos y credenciales.
      </p>
      <div style={{ width: '100%', maxWidth: 320 }}>
        <label style={{
          display: 'block', fontSize: '0.7rem', fontWeight: 600,
          color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
          letterSpacing: 1, marginBottom: 8, textAlign: 'left',
        }}>
          Clave maestra
        </label>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          placeholder="Ingresa la clave..."
          autoComplete="off"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 14,
            border: `1px solid ${error ? '#ff0055' : 'rgba(179,0,255,0.25)'}`,
            background: 'rgba(18,4,35,0.6)', color: '#fff',
            fontFamily: "'Inter', sans-serif", fontSize: '1rem',
            outline: 'none', backdropFilter: 'blur(12px)',
            transition: 'border-color 0.2s',
          }}
        />
        {error && (
          <p style={{ color: '#ff0055', fontSize: '0.8rem', marginTop: 12 }}>
            Clave incorrecta
          </p>
        )}
        <button
          onClick={doLogin}
          style={{
            width: '100%', padding: 14, marginTop: 16, border: 'none', borderRadius: 14,
            background: 'linear-gradient(135deg, #b300ff, #6a00ff)',
            color: '#fff', fontFamily: "'Outfit', sans-serif",
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(179,0,255,0.3)',
          }}
        >
          Acceder al Panel
        </button>
      </div>
    </div>
  );
}
