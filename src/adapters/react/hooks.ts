/**
 * TraceScope React Hooks
 * Custom hooks for interacting with TraceScope context
 */

import { useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { TraceScopeContext, type TraceScopeContextValue } from './context';
import type { TraceScopeConfig, TraceScopeState, ConnectionState } from '../../types/config';
import type { StreamNode, NodeMap } from '../../types/node';
import type { TreeNode } from '../../types/tree';

/**
 * Get TraceScope context value
 * @returns Context value or throw error if not in provider
 */
function useTraceScopeContextInternal(): TraceScopeContextValue {
  const context = useContext(TraceScopeContext);
  
  if (!context.config) {
    throw new Error('useTraceScope must be used within a TraceScopeProvider');
  }
  
  return context;
}

/**
 * Main hook for TraceScope functionality
 * @param config - TraceScope configuration
 * @returns TraceScope state and methods
 */
export function useTraceScope(
  config: TraceScopeConfig
): TraceScopeState & {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  reset: () => void;
  getNode: (nodeId: string) => StreamNode | undefined;
  toggleExpanded: (nodeId: string) => void;
} {
  // This hook is typically used within TraceScopeProvider
  // If used outside, it will return the context values
  const context = useTraceScopeContextInternal();
  
  return useMemo(() => ({
    nodes: context.nodes,
    tree: context.tree,
    connectionState: context.connectionState,
    error: context.error,
    connect: context.connect,
    disconnect: context.disconnect,
    reconnect: context.reconnect,
    reset: context.reset,
    getNode: context.getNode,
    toggleExpanded: context.toggleExpanded,
  }), [
    context.nodes,
    context.tree,
    context.connectionState,
    context.error,
    context.connect,
    context.disconnect,
    context.reconnect,
    context.reset,
    context.getNode,
    context.toggleExpanded,
  ]);
}

/**
 * Hook to get a specific node by ID
 * @param nodeId - Node identifier
 * @returns Node data or undefined
 */
export function useTraceNode(nodeId: string | null | undefined): StreamNode | undefined {
  const context = useTraceScopeContextInternal();
  
  if (!nodeId) {
    return undefined;
  }
  
  return context.nodes[nodeId];
}

/**
 * Hook to get the tree structure
 * @returns Root tree node
 */
export function useTraceTree(): TreeNode | null {
  const context = useTraceScopeContextInternal();
  return context.tree;
}

/**
 * Hook to get connection state
 * @returns Current connection state
 */
export function useConnectionState(): ConnectionState {
  const context = useTraceScopeContextInternal();
  return context.connectionState;
}

/**
 * Hook to get all nodes
 * @returns Node map
 */
export function useNodes(): NodeMap {
  const context = useTraceScopeContextInternal();
  return context.nodes;
}

/**
 * Hook to get error state
 * @returns Current error or null
 */
export function useError(): Error | null {
  const context = useTraceScopeContextInternal();
  return context.error;
}

/**
 * Hook to control connection
 * @returns Connection control functions
 */
export function useConnection() {
  const context = useTraceScopeContextInternal();
  
  return useMemo(() => ({
    connect: context.connect,
    disconnect: context.disconnect,
    reconnect: context.reconnect,
    reset: context.reset,
  }), [context.connect, context.disconnect, context.reconnect, context.reset]);
}

/**
 * Hook for node expansion state
 * @param nodeId - Node identifier
 * @returns Expansion state and toggle function
 */
export function useNodeExpanded(nodeId: string): {
  isExpanded: boolean;
  toggle: () => void;
} {
  const context = useTraceScopeContextInternal();
  const [isExpanded, setIsExpanded] = useState(true);
  
  useEffect(() => {
    // Could track expansion state in context
    setIsExpanded(true);
  }, [nodeId]);
  
  const toggle = useCallback(() => {
    context.toggleExpanded(nodeId);
    setIsExpanded(prev => !prev);
  }, [context.toggleExpanded, nodeId]);
  
  return { isExpanded, toggle };
}

/**
 * Hook for streaming status
 * @returns Object with streaming info
 */
export function useStreamingStatus() {
  const nodes = useNodes();
  
  const streamingCount = useMemo(() => {
    return Object.values(nodes).filter(n => n.status === 'streaming').length;
  }, [nodes]);
  
  const completeCount = useMemo(() => {
    return Object.values(nodes).filter(n => n.status === 'complete').length;
  }, [nodes]);
  
  const errorCount = useMemo(() => {
    return Object.values(nodes).filter(n => n.status === 'error').length;
  }, [nodes]);
  
  const isStreaming = streamingCount > 0;
  
  return {
    streamingCount,
    completeCount,
    errorCount,
    totalCount: Object.keys(nodes).length,
    isStreaming,
  };
}

/**
 * Hook for filtered nodes
 * @param filter - Filter options
 * @returns Filtered node array
 */
export function useFilteredNodes(filter?: {
  agentId?: string;
  nodeType?: string;
  status?: string;
  query?: string;
}): { filtered: StreamNode[]; filteredCount: number; totalCount: number } {
  const nodes = useNodes();
  const allNodes = Object.values(nodes);
  
  const filtered = useMemo(() => {
    let result = allNodes;
    
    if (filter?.query) {
      const query = filter.query.toLowerCase();
      result = result.filter(n => 
        n.chunk?.toLowerCase().includes(query) ||
        n.nodeId?.toLowerCase().includes(query)
      );
    }
    
    if (filter?.agentId) {
      result = result.filter(n => n.agentId === filter.agentId);
    }
    
    if (filter?.nodeType) {
      result = result.filter(n => n.nodeType === filter.nodeType);
    }
    
    if (filter?.status) {
      result = result.filter(n => n.status === filter.status);
    }
    
    return result;
  }, [allNodes, filter?.query, filter?.agentId, filter?.nodeType, filter?.status]);
  
  return {
    filtered,
    filteredCount: filtered.length,
    totalCount: allNodes.length,
  };
}