/**
 * Status Indicator Component
 * Shows streaming animation for in-progress nodes
 */

import React from 'react';
import type { NodeStatus } from '../types/node';
import './StatusIndicator.css';

export interface StatusIndicatorProps {
  /**
   * Node status to display
   */
  status?: NodeStatus;
  
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * StatusIndicator Component
 * Visual indicator for node execution status
 */
export function StatusIndicator({ status, className = '' }: StatusIndicatorProps): JSX.Element | null {
  // Don't show indicator for complete status
  if (status === 'complete' || !status) {
    return null;
  }
  
  // Error status
  if (status === 'error') {
    return (
      <span className={`status-indicator status-error ${className}`}>
        <span className="status-dot error" />
        <span className="status-text">Failed</span>
      </span>
    );
  }
  
  // Streaming status (default)
  return (
    <span className={`status-indicator status-streaming ${className}`}>
      <span className="status-dot streaming" />
      <span className="status-text">Streaming</span>
    </span>
  );
}

export default StatusIndicator;