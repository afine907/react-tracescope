/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 * Prevents entire tree from crashing on single node error
 * 
 * @package @tracescope/react
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /**
   * Child components to wrap
   */
  children: ReactNode;
  
  /**
   * Fallback UI when error occurs
   */
  fallback?: ReactNode;
  
  /**
   * Callback when error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /**
   * Enable error reporting (for debugging)
   */
  reportErrors?: boolean;
}

export interface ErrorBoundaryState {
  /**
   * Whether an error has occurred
   */
  hasError: boolean;
  
  /**
   * The error that was caught
   */
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * Catches and handles React component errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Catch and handle errors
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[TraceScope ErrorBoundary] Caught error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    if (this.props.reportErrors) {
      this.reportError(error, errorInfo);
    }
  }

  /**
   * Report error to external service (optional)
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // In production, this could send to error tracking service
    // e.g., Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && window.fetch) {
      window.fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail - don't crash on error reporting failure
      });
    }
  }

  /**
   * Reset error state to try again
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="tracescope-error-boundary" role="alert">
          <div className="error-boundary-icon" aria-hidden="true">⚠️</div>
          <div className="error-boundary-title">Something went wrong</div>
          <div className="error-boundary-message">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            type="button"
            className="error-boundary-reset"
            onClick={this.resetError}
            aria-label="Try again to recover from error"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;