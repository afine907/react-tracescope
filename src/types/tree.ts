/**
 * Tree structure type definitions
 * Hierarchical data representation for trace visualization
 */

import type { StreamNode, NodeMap } from './node';

/**
 * Tree traversal strategies
 */
export type TraversalType = 'DFS' | 'BFS';

/**
 * Tree node for rendering
 * Contains both data and children references
 */
export interface TreeNode {
  /**
   * Unique node identifier
   */
  nodeId: string;

  /**
   * Associated stream node data
   */
  data: StreamNode;

  /**
   * Child tree nodes
   * Empty array for leaf nodes
   */
  children: TreeNode[];

  /**
   * Depth level in the tree (0-based)
   * Root nodes have depth 0
   */
  depth: number;

  /**
   * Whether the node is expanded (for collapsible UI)
   * @default true
   */
  isExpanded: boolean;
}

/**
 * Tree construction options
 */
export interface TreeBuildOptions {
  /**
   * Initial expansion state for all nodes
   * @default true
   */
  defaultExpanded?: boolean;

  /**
   * Sort children by a specific field
   */
  sortBy?: keyof StreamNode;

  /**
   * Sort direction
   * @default 'asc'
   */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Traversal callback function type
 */
export type TraversalCallback = (node: TreeNode) => void | boolean;

/**
 * Node path from root to target
 * Used for tree navigation and breadcrumbs
 */
export interface NodePath {
  /**
   * List of node IDs from root to current
   */
  nodeIds: string[];

  /**
   * Depth of the target node
   */
  depth: number;
}

/**
 * Adjacency list representation
 * Internal structure for tree building
 */
export interface AdjacencyList {
  [parentId: string]: string[];
}

/**
 * Orphan nodes collection
 * Nodes whose parent hasn't been created yet
 */
export interface OrphanNodes {
  [pendingParentId: string]: StreamNode[];
}