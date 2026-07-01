import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/animations.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={
          <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0a0014',
          }}>
            <div className="skeleton-shimmer" style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }} />
          </div>
        }>
          <App />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
