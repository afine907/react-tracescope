/**
 * Tree Builder
 * Constructs and manages hierarchical tree structure from flat node map
 */

import type { StreamNode, NodeMap } from '../../types/node';
import type { TreeNode, TreeBuildOptions, TraversalType, TraversalCallback } from '../../types/tree';

/**
 * Tree Builder class
 * Builds and maintains tree structure from flattened node data
 */
export class TreeBuilder {
  private root: TreeNode | null = null;
  private nodeCache: Map<string, TreeNode> = new Map();
  private isDirty = false;

  /**
   * Build tree from node map
   * @param nodes - Flattened node map
   * @param options - Build options
   * @returns Root tree node or null if no nodes
   */
  buildTree(nodes: NodeMap, options: TreeBuildOptions = {}): TreeNode | null {
    const { defaultExpanded = true } = options;
    const nodeArray = Object.values(nodes);
    
    if (nodeArray.length === 0) {
      this.root = null;
      this.nodeCache.clear();
      return null;
    }

    // Build adjacency list
    const childrenMap: Map<string | null, StreamNode[]> = new Map();
    
    // Initialize all parent IDs
    nodeArray.forEach(node => {
      const parentId = node.parentId ?? null;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(node);
    });

    // Find root nodes (parentId = null or undefined)
    const roots = childrenMap.get(null) || [];
    
    if (roots.length === 0) {
      console.warn('[TreeBuilder] No root node found');
      return null;
    }

    // Clear cache and rebuild
    this.nodeCache.clear();
    
    // Build tree recursively
    const buildNode = (node: StreamNode, depth: number): TreeNode => {
      const treeNode: TreeNode = {
        nodeId: node.nodeId,
        data: node,
        children: [],
        depth,
        isExpanded: defaultExpanded,
      };

      this.nodeCache.set(node.nodeId, treeNode);

      // Get children for this node
      const children = childrenMap.get(node.nodeId) || [];
      
      // Recursively build child nodes
      treeNode.children = children
        .map(child => buildNode(child, depth + 1))
        .sort((a, b) => (a.data.createdAt ?? 0) - (b.data.createdAt ?? 0));

      return treeNode;
    };

    // If multiple roots, wrap them in a virtual root
    if (roots.length === 1) {
      this.root = buildNode(roots[0], 0);
    } else {
      // Multiple roots - create virtual root
      this.root = {
        nodeId: '__virtual_root__',
        data: {
          nodeId: '__virtual_root__',
          chunk: '',
          status: 'complete',
        },
        children: roots
          .map(root => buildNode(root, 0))
          .sort((a, b) => (a.data.createdAt ?? 0) - (b.data.createdAt ?? 0)),
        depth: -1,
        isExpanded: true,
      };
    }

    this.isDirty = false;
    return this.root;
  }

  /**
   * Add a single node to existing tree
   * @param node - New node to add
   * @returns Updated root or null
   */
  addNode(node: StreamNode): TreeNode | null {
    if (!this.root) {
      // No existing tree, create new
      this.root = {
        nodeId: node.nodeId,
        data: node,
        children: [],
        depth: 0,
        isExpanded: true,
      };
      this.nodeCache.set(node.nodeId, this.root);
      return this.root;
    }

    // Find parent and add as child
    if (node.parentId) {
      const parent = this.findNode(node.parentId);
      if (parent) {
        const newTreeNode: TreeNode = {
          nodeId: node.nodeId,
          data: node,
          children: [],
          depth: parent.depth + 1,
          isExpanded: true,
        };
        parent.children.push(newTreeNode);
        parent.children.sort((a, b) => (a.data.createdAt ?? 0) - (b.data.createdAt ?? 0));
        this.nodeCache.set(node.nodeId, newTreeNode);
      } else {
        // Parent not found, add to root as orphan
        const orphanNode: TreeNode = {
          nodeId: node.nodeId,
          data: node,
          children: [],
          depth: 0,
          isExpanded: true,
        };
        this.root.children.push(orphanNode);
        this.nodeCache.set(node.nodeId, orphanNode);
      }
    } else {
      // Root node, add to root children
      const rootNode: TreeNode = {
        nodeId: node.nodeId,
        data: node,
        children: [],
        depth: 0,
        isExpanded: true,
      };
      this.root.children.push(rootNode);
      this.nodeCache.set(node.nodeId, rootNode);
    }

    this.isDirty = true;
    return this.root;
  }

  /**
   * Update an existing node's data
   * @param nodeId - Node ID to update
   * @param data - Partial data updates
   * @returns true if update was successful
   */
  updateNode(nodeId: string, data: Partial<StreamNode>): boolean {
    const treeNode = this.findNode(nodeId);
    if (!treeNode) {
      return false;
    }

    treeNode.data = { ...treeNode.data, ...data };
    this.isDirty = true;
    return true;
  }

  /**
   * Find a node by ID
   * @param nodeId - Node identifier
   * @returns Tree node or null if not found
   */
  findNode(nodeId: string): TreeNode | null {
    return this.nodeCache.get(nodeId) || null;
  }

  /**
   * Get root node
   * @returns Root tree node
   */
  getRoot(): TreeNode | null {
    return this.root;
  }

  /**
   * Get all direct children of a node
   * @param nodeId - Parent node ID
   * @returns Array of child tree nodes
   */
  getChildren(nodeId: string): TreeNode[] {
    const node = this.findNode(nodeId);
    return node ? node.children : [];
  }

  /**
   * Get depth of a node
   * @param nodeId - Node identifier
   * @returns Depth level or -1 if not found
   */
  getDepth(nodeId: string): number {
    const node = this.findNode(nodeId);
    return node ? node.depth : -1;
  }

  /**
   * Traverse tree in specified order
   * @param type - Traversal type (DFS or BFS)
   * @param callback - Function to call for each node
   * @returns false if traversal was aborted
   */
  traverse(type: TraversalType, callback: TraversalCallback): boolean {
    if (!this.root) {
      return true;
    }

    if (type === 'DFS') {
      return this.depthFirstSearch(this.root, callback);
    } else {
      return this.breadthFirstSearch(this.root, callback);
    }
  }

  /**
   * Depth-first search traversal
   */
  private depthFirstSearch(node: TreeNode, callback: TraversalCallback): boolean {
    const result = callback(node);
    if (result === false) {
      return false;
    }

    for (const child of node.children) {
      if (!this.depthFirstSearch(child, callback)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Breadth-first search traversal
   */
  private breadthFirstSearch(root: TreeNode, callback: TraversalCallback): boolean {
    const queue: TreeNode[] = [root];
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      const result = callback(node);
      
      if (result === false) {
        return false;
      }

      queue.push(...node.children);
    }

    return true;
  }

  /**
   * Get all root-level nodes
   * @returns Array of root children
   */
  getRootNodes(): TreeNode[] {
    return this.root ? this.root.children : [];
  }

  /**
   * Get total node count
   * @returns Number of nodes in tree
   */
  getNodeCount(): number {
    return this.nodeCache.size;
  }

  /**
   * Check if tree is dirty (needs rebuild)
   * @returns true if tree has pending changes
   */
  isTreeDirty(): boolean {
    return this.isDirty;
  }

  /**
   * Clear the tree
   */
  clear(): void {
    this.root = null;
    this.nodeCache.clear();
    this.isDirty = false;
  }

  /**
   * Toggle node expansion state
   * @param nodeId - Node identifier
   * @returns New expansion state or null if node not found
   */
  toggleExpanded(nodeId: string): boolean | null {
    const node = this.findNode(nodeId);
    if (!node) {
      return null;
    }

    node.isExpanded = !node.isExpanded;
    return node.isExpanded;
  }

  /**
   * Set node expansion state
   * @param nodeId - Node identifier
   * @param expanded - Target expansion state
   * @returns true if state was changed
   */
  setExpanded(nodeId: string, expanded: boolean): boolean {
    const node = this.findNode(nodeId);
    if (!node || node.isExpanded === expanded) {
      return false;
    }

    node.isExpanded = expanded;
    return true;
  }

  /**
   * Get all descendants of a node (children, grandchildren, etc.)
   * Uses iterative BFS to avoid stack overflow on deep trees
   * @param nodeId - Parent node ID
   * @returns Array of all descendant tree nodes
   */
  getAllDescendants(nodeId: string): TreeNode[] {
    const node = this.findNode(nodeId);
    if (!node) {
      return [];
    }

    const descendants: TreeNode[] = [];
    const queue: TreeNode[] = [...node.children];

    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.push(current);
      queue.push(...current.children);
    }

    return descendants;
  }

  /**
   * Get path from root to target node
   * @param nodeId - Target node ID
   * @returns Array of node IDs representing the path
   */
  getPath(nodeId: string): string[] {
    const path: string[] = [];
    
    const findPath = (node: TreeNode, targetId: string): boolean => {
      path.push(node.nodeId);
      
      if (node.nodeId === targetId) {
        return true;
      }

      for (const child of node.children) {
        if (findPath(child, targetId)) {
          return true;
        }
      }

      path.pop();
      return false;
    };

    if (this.root) {
      findPath(this.root, nodeId);
    }

    return path;
  }
}

/**
 * Create Tree Builder factory function
 */
export function createTreeBuilder(): TreeBuilder {
  return new TreeBuilder();
}