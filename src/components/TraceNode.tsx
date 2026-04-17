/**
 * Trace Node Component
 * Recursive component for rendering tree nodes with indentation
 */

import React, { useMemo } from 'react';
import type { TreeNode } from '../types/tree';
import { NodeHeader } from './NodeHeader';
import { NodeContent } from './NodeContent';
import { useNodeExpanded } from '../adapters/react/hooks';
import { useTreeKeyboard } from '../hooks';

export interface TraceNodeProps {
  node: TreeNode;
  depth: number;
  className?: string;
}

/**
 * Default indentation per level (32px)
 */
const INDENT_SIZE = 32;

// Map node types to CSS classes
const NODE_TYPE_CLASSES: Record<string, string> = {
  user_input: 'ts-node-user-input',
  assistant_thought: 'ts-node-thought',
  tool_call: 'ts-node-tool',
  code_execution: 'ts-node-code',
  execution_result: 'ts-node-result',
  final_output: 'ts-node-output',
  error: 'ts-node-error',
};

/**
 * TraceNode Component
 * Recursively renders a node and its children
 */
export function TraceNode({ node, depth, className = '' }: TraceNodeProps): JSX.Element {
  const { isExpanded, toggle } = useNodeExpanded(node.nodeId);

  // Calculate indentation
  const indentStyle = useMemo(() => ({
    paddingLeft: `${depth * INDENT_SIZE}px`,
  }), [depth]);

  // Get node type for styling
  const nodeType = node.data.nodeType || 'final_output';
  const nodeClass = NODE_TYPE_CLASSES[nodeType] || NODE_TYPE_CLASSES.final_output;

  // Determine if node has children
  const hasChildren = node.children && node.children.length > 0;

  // Keyboard navigation
  const handleKeyDown = useTreeKeyboard({
    hasChildren,
    onToggle: toggle,
  });

  return (
    <div
      className={`ts-node ${nodeClass} ${className}`}
      style={indentStyle}
      data-node-id={node.nodeId}
      data-depth={depth}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Node Header */}
      <NodeHeader
        node={node.data}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onToggleExpand={toggle}
      />

      {/* Node Content */}
      <NodeContent
        content={node.data.chunk}
        status={node.data.status}
        nodeType={nodeType}
      />

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-2">
          {node.children.map((child) => (
            <TraceNode
              key={child.nodeId}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TraceNode;
