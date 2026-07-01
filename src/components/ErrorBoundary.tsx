import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0014', color: '#f0e6ff', fontFamily: 'Inter, sans-serif',
          padding: 40, textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
            <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: '1.2rem', marginBottom: 8, color: '#ff0055' }}>
              Error inesperado
            </h1>
            <p style={{ color: '#a580c7', fontSize: '0.85rem', marginBottom: 20 }}>
              {this.state.error?.message || 'Ocurrió un error al renderizar esta página.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: 999, border: '1px solid #b300ff',
                background: 'rgba(179,0,255,0.15)', color: '#00f0ff',
                fontFamily: "'Orbitron', monospace", fontSize: '0.7rem', cursor: 'pointer',
              }}
            >
              RECARGAR
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
