/**
 * Immutable Update Utilities
 * Helper functions for immutable state updates
 */

import type { StreamNode, NodeMap } from '../../types/node';

/**
 * Create a new node with default values
 * @param nodeId - Unique node identifier
 * @param partial - Partial node data
 * @returns Complete StreamNode with defaults
 */
export function createNode(nodeId: string, partial: Partial<StreamNode> = {}): StreamNode {
  const now = Date.now();
  return {
    nodeId,
    parentId: partial.parentId ?? null,
    nodeType: partial.nodeType,
    chunk: partial.chunk ?? '',
    status: partial.status ?? 'streaming',
    agentId: partial.agentId,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    ...partial,
  };
}


/**
 * Update a single node immutably
 * @param nodes - Current node map
 * @param nodeId - Node ID to update
 * @param updates - Partial node updates
 * @returns New node map with updated node
 */
export function updateNodeImmutable(
  nodes: NodeMap,
  nodeId: string,
  updates: Partial<StreamNode>
): NodeMap {
  const existingNode = nodes[nodeId];
  if (!existingNode) {
    console.warn(`[StateManager] Node not found: ${nodeId}`);
    return nodes;
  }

  return {
    ...nodes,
    [nodeId]: {
      ...existingNode,
      ...updates,
      updatedAt: Date.now(),
    },
  };
}

/**
 * Add a new node immutably
 * @param nodes - Current node map
 * @param node - Node to add
 * @returns New node map with added node
 */
export function addNodeImmutable(nodes: NodeMap, node: StreamNode): NodeMap {
  if (nodes[node.nodeId]) {
    console.warn(`[StateManager] Node already exists: ${node.nodeId}`);
    return nodes;
  }

  return {
    ...nodes,
    [node.nodeId]: {
      ...node,
      createdAt: node.createdAt ?? Date.now(),
      updatedAt: node.updatedAt ?? Date.now(),
    },
  };
}


/**
 * Append content to a node immutably
 * @param nodes - Current node map
 * @param nodeId - Node ID to update
 * @param chunk - Content chunk to append
 * @param status - Optional status update
 * @returns New node map with appended content
 */
export function appendContentImmutable(
  nodes: NodeMap,
  nodeId: string,
  chunk: string,
  status?: StreamNode['status']
): NodeMap {
  const existingNode = nodes[nodeId];
  if (!existingNode) {
    console.warn(`[StateManager] Cannot append to non-existent node: ${nodeId}`);
    return nodes;
  }

  return {
    ...nodes,
    [nodeId]: {
      ...existingNode,
      chunk: existingNode.chunk + chunk,
      status: status ?? existingNode.status,
      updatedAt: Date.now(),
    },
  };
}

/**
 * Evict oldest nodes when limit is reached (FIFO)
 * @param nodes - Current node map
 * @param maxNodes - Maximum nodes to keep
 * @returns New node map within limit
 */
export function evictOldestNodes(nodes: NodeMap, maxNodes: number): NodeMap {
  // Handle edge case: maxNodes <= 0 should return empty map
  if (maxNodes <= 0) {
    return {};
  }

  if (Object.keys(nodes).length <= maxNodes) {
    return nodes;
  }

  // Sort by createdAt and remove oldest
  const sortedEntries = Object.entries(nodes)
    .sort(([, a], [, b]) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  const nodesToKeep = sortedEntries.slice(-maxNodes);
  const result: NodeMap = {};

  nodesToKeep.forEach(([id, node]) => {
    result[id] = node;
  });

  return result;
}

/**
 * Filter nodes by agent ID
 * @param nodes - Current node map
 * @param agentId - Agent ID to filter by
 * @returns Array of matching nodes
 */
export function filterNodesByAgent(nodes: NodeMap, agentId: string): StreamNode[] {
  return Object.values(nodes).filter(node => node.agentId === agentId);
}


