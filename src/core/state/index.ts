/**
 * State Manager
 * Manages node state with immutable updates and O(1) lookup
 */

import type { StreamNode, NodeMap, NodeEvent } from '../../types/node';
import type { StateManagerOptions } from '../../types/config';
import type { SSEStreamMessage } from '../../types/message';
import {
  createNode,
  addNodeImmutable,
  appendContentImmutable,
  updateNodeImmutable,
  evictOldestNodes,
  filterNodesByAgent,
} from './immutable';

/**
 * State Manager class
 * Provides immutable node state management with O(1) operations
 */
export class StateManager {
  private nodes: NodeMap = {};
  private maxNodes: number;
  private onNodeUpdate?: (nodeId: string, node: StreamNode) => void;
  private lastProcessedSeq = 0;
  private eventHandlers: Map<string, (event: NodeEvent) => void> = new Map();

  /**
   * Create a new State Manager instance
   * @param options - Configuration options
   */
  constructor(options: StateManagerOptions = {}) {
    this.maxNodes = options.maxNodes ?? 1000;
    this.onNodeUpdate = options.onNodeUpdate;
  }

  /**
   * Handle incoming SSE message
   * @param message - Validated SSE message
   */
  handleMessage(message: SSEStreamMessage): void {
    // Check sequence for ordering
    if (message.seq < this.lastProcessedSeq) {
      console.warn(`[StateManager] Out-of-order message: seq ${message.seq} < ${this.lastProcessedSeq}`);
    }
    this.lastProcessedSeq = message.seq;

    if (message.type === 'node_create') {
      this.handleNodeCreate(message.data);
    } else if (message.type === 'node_append') {
      this.handleNodeAppend(message);
    }
  }

  /**
   * Handle node creation event
   * @param nodeData - Node data from message
   */
  private handleNodeCreate(nodeData: StreamNode): void {
    const node = createNode(nodeData.nodeId, nodeData);
    
    // Check for existing node (deduplication)
    if (this.nodes[node.nodeId]) {
      console.warn(`[StateManager] Node already exists: ${node.nodeId}`);
      return;
    }

    // Add node and handle eviction if needed
    this.nodes = addNodeImmutable(this.nodes, node);
    
    if (Object.keys(this.nodes).length > this.maxNodes) {
      this.nodes = evictOldestNodes(this.nodes, this.maxNodes);
    }

    this.emitNodeUpdate(node.nodeId, node);
    this.emitEvent({ type: 'node_create', node });
  }

  /**
   * Handle node append event
   * @param message - SSE message with append data
   */
  private handleNodeAppend(message: SSEStreamMessage): void {
    const { nodeId, chunk, status } = message.data;

    if (!this.nodes[nodeId]) {
      console.warn(`[StateManager] Node not found for append: ${nodeId}`);
      // Could implement parent-waiting here
      return;
    }

    // Determine if this is a status update only (empty chunk)
    if (chunk === '' && status) {
      this.nodes = updateNodeImmutable(this.nodes, nodeId, { status });
    } else {
      // Append content (and optionally status)
      this.nodes = appendContentImmutable(this.nodes, nodeId, chunk, status);
    }

    const updatedNode = this.nodes[nodeId];
    this.emitNodeUpdate(nodeId, updatedNode);
    this.emitEvent({ 
      type: 'node_append', 
      nodeId, 
      chunk, 
      status: status ?? updatedNode.status 
    });
  }

  /**
   * Get a node by ID
   * @param nodeId - Node identifier
   * @returns Node data or undefined if not found
   */
  getNode(nodeId: string): StreamNode | undefined {
    return this.nodes[nodeId];
  }

  /**
   * Get all nodes as a map
   * @returns Complete node map (clone for immutability)
   */
  getAllNodes(): NodeMap {
    return { ...this.nodes };
  }

  /**
   * Get all nodes as an array
   * @returns Array of all nodes
   */
  getNodesArray(): StreamNode[] {
    return Object.values(this.nodes);
  }

  /**
   * Get nodes filtered by agent ID
   * @param agentId - Agent identifier
   * @returns Array of matching nodes
   */
  getNodesByAgent(agentId: string): StreamNode[] {
    return filterNodesByAgent(this.nodes, agentId);
  }

  /**
   * Get the total node count
   * @returns Number of nodes in state
   */
  getNodeCount(): number {
    return Object.keys(this.nodes).length;
  }

  /**
   * Check if a node exists
   * @param nodeId - Node identifier
   * @returns true if node exists
   */
  hasNode(nodeId: string): boolean {
    return nodeId in this.nodes;
  }

  /**
   * Update a node's data
   * @param nodeId - Node identifier
   * @param updates - Partial updates to apply
   * @returns true if update was successful
   */
  updateNode(nodeId: string, updates: Partial<StreamNode>): boolean {
    if (!this.nodes[nodeId]) {
      return false;
    }

    this.nodes = updateNodeImmutable(this.nodes, nodeId, updates);
    this.emitNodeUpdate(nodeId, this.nodes[nodeId]);
    return true;
  }

  /**
   * Delete a node
   * @param nodeId - Node identifier
   * @returns true if deletion was successful
   */
  deleteNode(nodeId: string): boolean {
    if (!this.nodes[nodeId]) {
      return false;
    }

    const { [nodeId]: _, ...rest } = this.nodes;
    this.nodes = rest;
    return true;
  }

  /**
   * Clear all nodes from state
   */
  clear(): void {
    this.nodes = {};
    this.lastProcessedSeq = 0;
  }

  /**
   * Register event handler
   * @param eventType - Event type to listen for
   * @param handler - Event handler function
   */
  on(eventType: string, handler: (event: NodeEvent) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Unregister event handler
   * @param eventType - Event type
   */
  off(eventType: string): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Get the last processed sequence number
   * @returns Last sequence number
   */
  getLastSeq(): number {
    return this.lastProcessedSeq;
  }

  /**
   * Emit node update callback
   */
  private emitNodeUpdate(nodeId: string, node: StreamNode): void {
    if (this.onNodeUpdate) {
      this.onNodeUpdate(nodeId, node);
    }
  }

  /**
   * Emit event to handlers
   */
  private emitEvent(event: NodeEvent): void {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event);
    }
    
    // Also emit to wildcard handler if exists
    const wildcardHandler = this.eventHandlers.get('*');
    if (wildcardHandler) {
      wildcardHandler(event);
    }
  }
}

/**
 * Create State Manager factory function
 */
export function createStateManager(options?: StateManagerOptions): StateManager {
  return new StateManager(options);
}