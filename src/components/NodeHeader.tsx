/**
 * Node Header Component
 * Displays node type badge, status indicator, and expand/collapse button
 */

import React, { useMemo } from 'react';
import type { StreamNode } from '../types/node';
import { StatusIndicator } from './StatusIndicator';
import './NodeHeader.css';

// Node type display configuration
const NODE_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  user_input: { label: 'User Input', className: 'badge-user_input' },
  assistant_thought: { label: 'Assistant Thought', className: 'badge-assistant_thought' },
  tool_call: { label: 'Tool Call', className: 'badge-tool_call' },
  code_execution: { label: 'Code Generation', className: 'badge-code_execution' },
  execution_result: { label: 'Execution Result', className: 'badge-execution_result' },
  final_output: { label: 'Final Output', className: 'badge-final_output' },
  error: { label: 'Error', className: 'badge-error' },
};

export interface NodeHeaderProps {
  /**
   * Node data
   */
  node: StreamNode;
  
  /**
   * Whether node is expanded
   */
  isExpanded: boolean;
  
  /**
   * Whether node has children
   */
  hasChildren: boolean;
  
  /**
   * Toggle expand callback
   */
  onToggleExpand?: () => void;
  
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * NodeHeader Component
 * Renders the header portion of a trace node
 */
export function NodeHeader({
  node,
  isExpanded,
  hasChildren,
  onToggleExpand,
  className = '',
}: NodeHeaderProps): JSX.Element {
  // Get config for node type
  const typeConfig = useMemo(() => {
    const nodeType = node.nodeType || 'final_output';
    return NODE_TYPE_CONFIG[nodeType] || NODE_TYPE_CONFIG.final_output;
  }, [node.nodeType]);
  
  // Determine status class
  const statusClass = useMemo(() => {
    if (node.status === 'error') return 'status-error';
    if (node.status === 'complete') return 'status-complete';
    return 'status-streaming';
  }, [node.status]);
  
  return (
    <div className={`node-header ${className}`}>
      {/* Expand/Collapse button */}
      {hasChildren && (
        <button
          className={`node-expand-btn ${isExpanded ? 'expanded' : 'collapsed'}`}
          onClick={onToggleExpand}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className="expand-icon">▶</span>
        </button>
      )}
      
      {/* Node type badge */}
      <span className={`node-type-badge ${typeConfig.className}`}>
        {typeConfig.label}
      </span>
      
      {/* Status indicator */}
      <StatusIndicator status={node.status} />
      
      {/* Node ID (optional, for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <span className="node-id-debug" title={node.nodeId}>
          #{node.nodeId.slice(0, 8)}
        </span>
      )}
    </div>
  );
}

export default NodeHeader;