/**
 * Node Header Component
 * Displays node type badge, status indicator, and expand/collapse button
 */

import React, { useMemo } from 'react';
import type { StreamNode } from '../types/node';
import { StatusIndicator } from './StatusIndicator';

// Node type display configuration
const NODE_TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  user_input: { label: 'User Input', badgeClass: 'ts-badge-user-input' },
  assistant_thought: { label: 'Assistant Thought', badgeClass: 'ts-badge-thought' },
  tool_call: { label: 'Tool Call', badgeClass: 'ts-badge-tool' },
  code_execution: { label: 'Code Generation', badgeClass: 'ts-badge-code' },
  execution_result: { label: 'Execution Result', badgeClass: 'ts-badge-result' },
  final_output: { label: 'Final Output', badgeClass: 'ts-badge-output' },
  error: { label: 'Error', badgeClass: 'ts-badge-error' },
};

export interface NodeHeaderProps {
  node: StreamNode;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleExpand?: () => void;
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

  return (
    <div className={`ts-node-header ${className}`}>
      {/* Expand/Collapse button */}
      {hasChildren && (
        <button
          className={`ts-expand-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={onToggleExpand}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className="inline-block">▶</span>
        </button>
      )}

      {/* Node type badge */}
      <span className={`ts-badge ${typeConfig.badgeClass}`}>
        {typeConfig.label}
      </span>

      {/* Status indicator */}
      <StatusIndicator status={node.status} />

      {/* Node ID (optional, for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <span
          className="text-[10px] text-tracescope-text-light font-mono ml-auto"
          title={node.nodeId}
        >
          #{node.nodeId.slice(0, 8)}
        </span>
      )}
    </div>
  );
}

export default NodeHeader;
