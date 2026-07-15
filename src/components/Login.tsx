import { useState } from 'react';
import { useAuthStore } from '../store';
import { API_BASE_URL } from '../config';
import '../styles/login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const loginAsUser = useAuthStore(s => s.loginAsUser);

  const doLogin = async () => {
    setErrorMsg('');
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('Ingresa usuario y contraseña');
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
        loginAsUser(data.token, data.username, data.device_id, data.role);
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
    <div className="login-page">
      <div className="login-icon">🔐</div>
      <h1 className="login-title">Acceso al Sistema</h1>
      <p className="login-subtitle">
        Ingresa tus credenciales para acceder a tu panel de monitoreo.
      </p>

      <div className="login-form">
        <div className="login-field">
          <label className="login-label" htmlFor="loginUsername">Usuario</label>
          <input
            id="loginUsername"
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setErrorMsg(''); }}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="Usuario asignado..."
            autoComplete="off"
            className={`login-input${errorMsg ? ' login-input--error' : ''}`}
          />
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="loginPassword">Contraseña</label>
          <input
            id="loginPassword"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="Tu contraseña..."
            autoComplete="off"
            className={`login-input${errorMsg ? ' login-input--error' : ''}`}
          />
        </div>

        {errorMsg && <p className="login-error">{errorMsg}</p>}

        <button className="login-button" onClick={doLogin} disabled={isLoading}>
          {isLoading ? 'Conectando...' : 'Acceder al Panel'}
        </button>
      </div>
    </div>
  );
}
