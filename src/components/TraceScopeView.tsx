/**
 * Main TraceScope View Component
 * Container for the entire trace visualization
 */

import React from 'react';
import { useConnectionState, useNodes, useError } from '../adapters/react/hooks';
import { ConnectionStatus } from './ConnectionStatus';
import { TraceTree } from './TraceTree';
import { Toolbar } from './Toolbar';
import './TraceScopeView.css';

export interface TraceScopeViewProps {
  /**
   * Show connection status indicator
   * @default true
   */
  showConnectionStatus?: boolean;
  
  /**
   * Show toolbar with actions
   * @default true
   */
  showToolbar?: boolean;
  
  /**
   * Custom class name
   */
  className?: string;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
}

/**
 * TraceScope View Component
 * Main container that displays the trace tree
 */
export function TraceScopeView({
  showConnectionStatus = true,
  showToolbar = true,
  className = '',
  style = {},
}: TraceScopeViewProps): JSX.Element | null {
  const connectionState = useConnectionState();
  const nodes = useNodes();
  const error = useError();
  
  const nodeCount = Object.keys(nodes).length;
  
  return (
    <div className={`tracescope-view ${className}`} style={style}>
      {/* Header with status and toolbar */}
      <div className="tracescope-header">
        {showConnectionStatus && (
          <ConnectionStatus state={connectionState} nodeCount={nodeCount} />
        )}
        
        {showToolbar && <Toolbar />}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="tracescope-error">
          <span className="tracescope-error-icon">⚠️</span>
          <span className="tracescope-error-message">{error.message}</span>
        </div>
      )}
      
      {/* Main trace tree */}
      <div className="tracescope-content">
        <TraceTree />
      </div>
      
      {/* Empty state */}
      {nodeCount === 0 && !error && connectionState === 'connected' && (
        <div className="tracescope-empty">
          <div className="tracescope-empty-icon">📭</div>
          <div className="tracescope-empty-text">Waiting for trace data...</div>
        </div>
      )}
    </div>
  );
}

export default TraceScopeView;