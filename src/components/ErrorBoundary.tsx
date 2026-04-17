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
        <div className="tracescope-error-boundary">
          <div className="error-boundary-icon">⚠️</div>
          <div className="error-boundary-title">Something went wrong</div>
          <div className="error-boundary-message">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button 
            className="error-boundary-reset"
            onClick={this.resetError}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error Boundary CSS (should be imported in main CSS file)
 */
export const ERROR_BOUNDARY_STYLES = `
.tracescope-error-boundary {
  padding: 20px;
  margin: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  text-align: center;
}

.error-boundary-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.error-boundary-title {
  font-size: 18px;
  font-weight: 600;
  color: #991b1b;
  margin-bottom: 8px;
}

.error-boundary-message {
  font-size: 14px;
  color: #b91c1c;
  margin-bottom: 16px;
  font-family: monospace;
}

.error-boundary-reset {
  padding: 8px 16px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.error-boundary-reset:hover {
  background: #b91c1c;
}
`;

export default ErrorBoundary;