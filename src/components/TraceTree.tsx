/**
 * Trace Tree Component
 * Renders the hierarchical tree structure of trace nodes
 */

import React from 'react';
import { useTraceTree } from '../adapters/react/hooks';
import { TraceNode } from './TraceNode';
import './TraceTree.css';

export interface TraceTreeProps {
  /**
   * Custom class name
   */
  className?: string;
  
  /**
   * Custom CSS styles
   */
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
      className={`trace-tree ${className}`}
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