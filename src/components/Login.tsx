import { useState } from 'react';
import { useAuthStore } from '../store';
import { API_BASE_URL } from '../config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const loginAsAdmin = useAuthStore(s => s.loginAsAdmin);
  const loginAsUser = useAuthStore(s => s.loginAsUser);

  const doLogin = async () => {
    setErrorMsg('');
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('Ingresa usuario y contraseña');
      return;
    }

    // Admin fallback / hardcoded master key
    if (trimmedUser === 'admin' && trimmedPass === '0504319310_cesar') {
      loginAsAdmin();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: trimmedUser, password: trimmedPass })
      });
      
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        loginAsUser(data.token, data.username, data.device_id);
      } else {
        setErrorMsg(data.detail || 'Credenciales inválidas');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
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
        Acceso al Sistema
      </h1>
      <p style={{ color: '#a580c7', fontSize: '0.85rem', marginBottom: 32 }}>
        Ingresa tus credenciales para acceder a tu panel de monitoreo.
      </p>
      
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{
            display: 'block', fontSize: '0.7rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
            letterSpacing: 1, marginBottom: 8, textAlign: 'left',
          }}>
            Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setErrorMsg(''); }}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="Usuario asignado..."
            autoComplete="off"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              border: `1px solid ${errorMsg ? '#ff0055' : 'rgba(179,0,255,0.25)'}`,
              background: 'rgba(18,4,35,0.6)', color: '#fff',
              fontFamily: "'Inter', sans-serif", fontSize: '1rem',
              outline: 'none', backdropFilter: 'blur(12px)',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block', fontSize: '0.7rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
            letterSpacing: 1, marginBottom: 8, textAlign: 'left',
          }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="Tu contraseña..."
            autoComplete="off"
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              border: `1px solid ${errorMsg ? '#ff0055' : 'rgba(179,0,255,0.25)'}`,
              background: 'rgba(18,4,35,0.6)', color: '#fff',
              fontFamily: "'Inter', sans-serif", fontSize: '1rem',
              outline: 'none', backdropFilter: 'blur(12px)',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        
        {errorMsg && (
          <p style={{ color: '#ff0055', fontSize: '0.8rem', marginTop: 4, marginBottom: 0 }}>
            {errorMsg}
          </p>
        )}
        
        <button
          onClick={doLogin}
          disabled={isLoading}
          style={{
            width: '100%', padding: 14, marginTop: 8, border: 'none', borderRadius: 14,
            background: 'linear-gradient(135deg, #b300ff, #6a00ff)',
            color: '#fff', fontFamily: "'Outfit', sans-serif",
            fontSize: '1rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(179,0,255,0.3)',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Conectando...' : 'Acceder al Panel'}
        </button>
      </div>
    </div>
  );
}
