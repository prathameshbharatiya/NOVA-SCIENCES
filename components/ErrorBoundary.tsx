
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  // Fix: Make children optional to satisfy JSX type checking where children are passed as tag content.
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fix: Use React.Component to ensure that 'this.props' and 'this.state' are correctly typed and available within the class.
class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Explicitly initializing state as a class property to ensure TypeScript visibility.
  public state: State = {
    hasError: false,
    error: null
  };

  // Fix: Explicit constructor to ensure props are correctly initialized in the base class.
  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL UI ERROR:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: Accessing props and state via 'this' which are now correctly inherited from React.Component.
    const { children } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-slate-50 text-center">
          <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mb-8 text-4xl shadow-2xl shadow-rose-200 animate-bounce">
            <i className="fa-solid fa-microchip"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Synthesis Render Failure</h1>
          <p className="text-slate-500 mb-10 font-medium max-w-lg leading-relaxed text-lg">
            The application encountered a runtime error while building the analysis view. This is likely due to malformed protein data or a mismatch in the molecular model.
          </p>
          <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 text-left mb-10 w-full max-w-2xl shadow-inner group transition-all">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Stack Trace / Debug Log</div>
            <code className="text-xs text-rose-500 font-mono leading-relaxed block overflow-auto max-h-60 custom-scrollbar">
              {error?.stack || error?.toString()}
            </code>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-3"
            >
              <i className="fa-solid fa-eraser"></i> Wipe Cache & Restart
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
            >
              <i className="fa-solid fa-rotate"></i> Attempt Hot Reload
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
