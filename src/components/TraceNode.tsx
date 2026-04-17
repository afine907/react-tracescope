/**
 * Trace Node Component
 * Recursive component for rendering tree nodes with indentation
 */

import React, { useMemo } from 'react';
import type { TreeNode } from '../types/tree';
import { NodeHeader } from './NodeHeader';
import { NodeContent } from './NodeContent';
import { useNodeExpanded } from '../adapters/react/hooks';
import './TraceNode.css';

export interface TraceNodeProps {
  /**
   * Tree node data
   */
  node: TreeNode;
  
  /**
   * Current depth level (for indentation)
   */
  depth: number;
  
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Default indentation per level (32px)
 */
const INDENT_SIZE = 32;

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
  
  // Determine if node has children
  const hasChildren = node.children && node.children.length > 0;
  
  return (
    <div 
      className={`trace-node trace-node-${nodeType} ${className}`}
      style={indentStyle}
      data-node-id={node.nodeId}
      data-depth={depth}
    >
      {/* Node Header (type badge, status, expand button) */}
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
      
      {/* Children (if expanded) */}
      {hasChildren && isExpanded && (
        <div className="trace-node-children">
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