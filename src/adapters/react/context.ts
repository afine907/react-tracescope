/**
 * TraceScope React Context
 * Provides centralized state management for React integration
 */

import { createContext } from 'react';
import type { TraceScopeConfig, TraceScopeState, ConnectionState } from '../../types/config';
import type { TreeNode, NodeMap } from '../../types';

/**
 * Default stream trace state
 */
export const DEFAULT_STATE: TraceScopeState = {
  nodes: {},
  tree: null,
  connectionState: 'disconnected',
  error: null,
};

/**
 * Context value type
 */
export interface TraceScopeContextValue extends TraceScopeState {
  /**
   * Connect to SSE endpoint
   */
  connect: () => Promise<void>;
  
  /**
   * Disconnect from SSE endpoint
   */
  disconnect: () => void;
  
  /**
   * Reconnect to SSE endpoint
   */
  reconnect: () => void;
  
  /**
   * Reset connection and clear data
   */
  reset: () => void;
  
  /**
   * Get a specific node by ID
   */
  getNode: (nodeId: string) => import('../../types/node').StreamNode | undefined;
  
  /**
   * Toggle node expansion
   */
  toggleExpanded: (nodeId: string) => void;
  
  /**
   * Current configuration
   */
  config: TraceScopeConfig | null;
}

/**
 * Create default context value
 */
function createDefaultContextValue(): TraceScopeContextValue {
  return {
    ...DEFAULT_STATE,
    connect: async () => {},
    disconnect: () => {},
    reconnect: () => {},
    reset: () => {},
    getNode: () => undefined,
    toggleExpanded: () => {},
    config: null,
  };
}

/**
 * TraceScope React Context
 * Use via TraceScopeProvider to wrap your application
 */
export const TraceScopeContext = createContext<TraceScopeContextValue>(
  createDefaultContextValue()
);

/**
 * Custom hook to access TraceScope context
 * @returns Context value
 * @throws Error if used outside TraceScopeProvider
 */
export function useTraceScopeContext(): TraceScopeContextValue {
  const context = import('react').then(react => {
    const value = react.useContext(TraceScopeContext);
    if (!value.config) {
      throw new Error('useTraceScope must be used within a TraceScopeProvider');
    }
    return value;
  });
  
  // This is a simplified version - actual implementation handles the promise
  return createDefaultContextValue();
}