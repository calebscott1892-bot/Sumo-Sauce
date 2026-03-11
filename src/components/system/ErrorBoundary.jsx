import React from 'react';

/**
 * Application-level error boundary with:
 * - Structured fallback UI
 * - Retry button (resets error state)
 * - Error detail display (dev mode)
 * - Error logging hook for future integration
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);

    // Structured error log for future analytics integration
    try {
      const errorEvent = {
        type: 'unhandled_render_error',
        message: error?.message || 'Unknown error',
        stack: error?.stack?.slice(0, 500),
        componentStack: errorInfo?.componentStack?.slice(0, 500),
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      };
      // Store in sessionStorage for post-recovery inspection
      const existing = JSON.parse(sessionStorage.getItem('sumowatch_errors') || '[]');
      existing.push(errorEvent);
      // Keep only last 10 errors
      if (existing.length > 10) existing.splice(0, existing.length - 10);
      sessionStorage.setItem('sumowatch_errors', JSON.stringify(existing));
    } catch {
      // Logging should never throw
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback via props
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env?.DEV;

      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
          <div className="w-full max-w-md rounded-xl border border-red-800 bg-zinc-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-950 text-red-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-400">
              An unexpected error occurred while rendering this page.
            </p>

            {this.state.error?.message && (
              <p className="mt-3 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-mono text-zinc-500 break-all">
                {this.state.error.message}
              </p>
            )}

            {isDev && this.state.errorInfo?.componentStack && (
              <details className="mt-3 text-left">
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
                  Component stack trace
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-zinc-800 px-3 py-2 text-[10px] font-mono text-zinc-600">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
              >
                Reload page
              </button>
              <a
                href="/"
                className="rounded-md border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
              >
                Back to home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
