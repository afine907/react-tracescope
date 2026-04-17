/**
 * Connection Status Component
 * Displays current SSE connection state
 */

import React from 'react';
import type { ConnectionState } from '../types/config';
import './ConnectionStatus.css';

// Connection state configuration
const STATE_CONFIG: Record<ConnectionState, { label: string; icon: string; className: string }> = {
  connecting: { label: 'Connecting...', icon: '🔄', className: 'state-connecting' },
  connected: { label: 'Connected', icon: '✅', className: 'state-connected' },
  disconnected: { label: 'Disconnected', icon: '⏸️', className: 'state-disconnected' },
  error: { label: 'Error', icon: '❌', className: 'state-error' },
};

export interface ConnectionStatusProps {
  /**
   * Current connection state
   */
  state: ConnectionState;
  
  /**
   * Number of nodes received
   */
  nodeCount?: number;
  
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * ConnectionStatus Component
 * Shows current connection status and node count
 */
export function ConnectionStatus({ 
  state, 
  nodeCount = 0, 
  className = '' 
}: ConnectionStatusProps): JSX.Element {
  const config = STATE_CONFIG[state] || STATE_CONFIG.disconnected;
  
  return (
    <div className={`connection-status ${config.className} ${className}`}>
      <span className="connection-icon">{config.icon}</span>
      <span className="connection-label">{config.label}</span>
      {nodeCount > 0 && (
        <span className="connection-count">{nodeCount} nodes</span>
      )}
    </div>
  );
}

export default ConnectionStatus;