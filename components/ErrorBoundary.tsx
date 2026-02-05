
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fixed ErrorBoundary to correctly inherit from React.Component with typed props and state to avoid TS errors
class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("FATAL UI ERROR:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#f8fafc',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>UNRECOVERABLE RENDER ERROR</h1>
          <p style={{ maxWidth: '40rem', color: '#64748b', marginBottom: '2rem' }}>
            The synthesis engine crashed while drawing the results. This usually happens due to a browser memory issue or malformed data from the AI.
          </p>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '2px solid #e2e8f0',
            textAlign: 'left',
            marginBottom: '2rem',
            maxWidth: '100%',
            overflowX: 'auto'
          }}>
            <code style={{ fontSize: '0.8rem', color: '#ef4444', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.message || "Unknown Error"}
            </code>
          </div>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }} 
            style={{
              backgroundColor: '#4f46e5',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '1rem',
              fontWeight: 900,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            CLEAR CACHE & RESTART SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
