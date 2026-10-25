import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { CONFIG } from '../../config';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : 'An unexpected rendering error occurred.';
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Intentionally handled cleanly by boundary state without noisy console spam
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-[50dvh] flex flex-col items-center justify-center px-6 py-16 text-center bg-[#141414] text-white"
        >
          <div className="max-w-md w-full p-8 rounded-lg bg-[#1f1f1f] border border-white/10">
            <p className="text-xs font-semibold tracking-wider text-[var(--accent)] mb-2">
              {CONFIG.brandName} RECOVERY
            </p>
            <h2 className="text-xl font-bold mb-3">
              {this.props.fallbackTitle ?? 'Something went wrong loading this view'}
            </h2>
            <p className="text-sm text-[#b3b3b3] mb-6">{this.state.errorMessage}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="min-h-[44px] px-5 py-2.5 rounded bg-white text-black text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
              >
                Try Again
              </button>
              <a
                href="/"
                className="min-h-[44px] inline-flex items-center px-5 py-2.5 rounded bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
