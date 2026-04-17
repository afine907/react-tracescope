/**
 * Status Indicator Component
 * Shows streaming animation for in-progress nodes
 */

import React from 'react';
import type { NodeStatus } from '../types/node';

export interface StatusIndicatorProps {
  status?: NodeStatus;
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
      <span className={`ts-status ts-status-error ${className}`}>
        <span className="ts-status-dot error" />
        <span className="font-medium">Failed</span>
      </span>
    );
  }

  // Streaming status (default)
  return (
    <span className={`ts-status ts-status-streaming ${className}`}>
      <span className="ts-status-dot streaming" />
      <span className="font-medium">Streaming</span>
    </span>
  );
}

export default StatusIndicator;
