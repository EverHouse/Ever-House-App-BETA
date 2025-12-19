import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Page error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <span className="material-symbols-outlined text-5xl text-red-400/60 mb-4">
            error_outline
          </span>
          <h2 className="text-xl font-semibold text-primary dark:text-white mb-2">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h2>
          <p className="text-primary/60 dark:text-white/60 mb-6 max-w-sm">
            We couldn't load this content. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-brand-green rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
