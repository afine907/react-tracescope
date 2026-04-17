/**
 * Trace Tree Component
 * Renders the hierarchical tree structure of trace nodes
 */

import React from 'react';
import { useTraceTree } from '../adapters/react/hooks';
import { TraceNode } from './TraceNode';

export interface TraceTreeProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * TraceTree Component
 * Renders the complete tree structure
 */
export function TraceTree({ className = '', style = {} }: TraceTreeProps): JSX.Element | null {
  const tree = useTraceTree();

  if (!tree) {
    return null;
  }

  // If it's a virtual root, render its children directly
  const children = tree.nodeId === '__virtual_root__'
    ? tree.children
    : [tree];

  return (
    <div
      className={`ts-tree-wrapper ${className}`}
      style={style}
      role="tree"
      aria-label="Trace tree view"
    >
      {children.map((child) => (
        <TraceNode
          key={child.nodeId}
          node={child}
          depth={child.depth >= 0 ? child.depth : 0}
        />
      ))}
    </div>
  );
}

export default TraceTree;
