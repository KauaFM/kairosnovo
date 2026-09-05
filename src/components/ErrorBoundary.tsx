import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════ */
/*  ERROR BOUNDARY — Global crash protection                   */
/*  Catches unhandled React errors and displays fallback UI    */
/*  Black & white brutalista aesthetic                          */
/* ═══════════════════════════════════════════════════════════ */

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Future: send to error tracking service (Sentry, etc.)
    console.error('[ORVAX Error Boundary]', error, errorInfo);
  }

  /** O erro é "pedaço do app sumiu depois de uma publicação nova"? */
  private ehErroDeChunk(): boolean {
    const msg = String(this.state.error?.message || '');
    return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|dynamically imported module/i.test(msg);
  }

  handleRetry = () => {
    // Quando o pedaço não existe mais no servidor, limpar o estado só faz o
    // import falhar de novo — a pessoa fica presa no erro. Nesse caso a única
    // saída real é buscar o index.html novo, com os nomes de arquivo certos.
    if (this.ehErroDeChunk()) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const en = (typeof localStorage !== 'undefined' && localStorage.getItem('orvax_lang') === 'en');
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] px-8 py-12">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl border border-neutral-200 dark:border-white/[0.06] flex items-center justify-center mb-5 bg-neutral-50 dark:bg-white/[0.02]">
            <AlertTriangle size={22} className="text-neutral-400 dark:text-white/25" />
          </div>

          {/* Title */}
          <h2 className="text-[13px] font-mono font-bold text-neutral-700 dark:text-white/60 mb-2 uppercase tracking-wider">
            {this.props.fallbackTitle || (en ? 'Module Failure' : 'Falha no Módulo')}
          </h2>

          {/* Error detail */}
          <p className="text-[9px] font-mono text-neutral-400 dark:text-white/20 text-center leading-relaxed mb-1 max-w-[280px]">
            {this.ehErroDeChunk()
              ? (en
                ? 'A new version was published. Reload to continue.'
                : 'Saiu uma versão nova do app. É só recarregar para continuar.')
              : (en
                ? 'An unexpected error occurred in this component.'
                : 'Um erro inesperado ocorreu neste componente.')}
          </p>
          {this.state.error && !this.ehErroDeChunk() && (
            <code className="text-[8px] font-mono text-neutral-300 dark:text-white/12 text-center mb-5 max-w-[300px] break-all">
              {this.state.error.message?.slice(0, 120)}
            </code>
          )}

          {/* Retry */}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/[0.06] text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-white/35 transition-all hover:border-neutral-400 dark:hover:border-white/15 hover:bg-neutral-50 dark:hover:bg-white/[0.02] active:scale-[0.97]"
          >
            <RefreshCw size={12} />
            {this.ehErroDeChunk()
              ? (en ? 'Reload' : 'Recarregar')
              : (en ? 'Try Again' : 'Tentar Novamente')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
