/**
 * Configuration type definitions
 * All configuration interfaces for TraceScope modules
 */

import type { NodeMap, StreamNode } from './node';
import type { TreeNode } from './tree';

/**
 * Connection state enumeration
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * SSE Manager configuration
 */
export interface SSEManagerConfig {
  /**
   * SSE endpoint URL
   */
  url: string;

  /**
   * Custom HTTP headers (e.g., auth tokens)
   */
  headers?: Record<string, string>;

  /**
   * Initial reconnect interval in milliseconds
   * @default 1000
   */
  reconnectInterval?: number;

  /**
   * Maximum reconnect interval in milliseconds
   * @default 30000
   */
  maxReconnectInterval?: number;

  /**
   * Callback fired when a valid message is received
   */
  onMessage?: (message: unknown) => void;

  /**
   * Callback fired on connection error
   */
  onError?: (error: Error) => void;

  /**
   * Callback fired when connection state changes
   */
  onStateChange?: (state: ConnectionState) => void;

  /**
   * Request query parameters
   */
  queryParams?: Record<string, string>;
}

/**
 * State manager configuration
 */
export interface StateManagerOptions {
  /**
   * Maximum number of nodes to store
   * Older nodes are evicted when limit is reached
   * @default 1000
   */
  maxNodes?: number;

  /**
   * Callback fired when a node is created or updated
   */
  onNodeUpdate?: (nodeId: string, node: StreamNode) => void;
}

/**
 * TraceScope main configuration
 */
export interface TraceScopeConfig {
  /**
   * SSE endpoint URL
   */
  url: string;

  /**
   * Custom HTTP headers
   */
  headers?: Record<string, string>;

  /**
   * Filter by specific agent ID
   */
  agentId?: string;

  /**
   * Theme configuration
   */
  theme?: ThemeConfig;

  /**
   * Error handler callback
   */
  onError?: (error: Error) => void;

  /**
   * Auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Render options
   */
  renderOptions?: RenderOptions;
}

/**
 * TraceScope public state
 */
export interface TraceScopeState {
  /**
   * All nodes in flatten map
   */
  nodes: NodeMap;

  /**
   * Constructed tree root
   */
  tree: TreeNode | null;

  /**
   * Current connection state
   */
  connectionState: ConnectionState;

  /**
   * Current error if any
   */
  error: Error | null;
}

/**
 * Node styling configuration
 */
export interface NodeStyleConfig {
  /**
   * Background color (hex or CSS variable)
   */
  backgroundColor?: string;

  /**
   * Border color
   */
  borderColor?: string;

  /**
   * Label text color
   */
  labelColor?: string;

  /**
   * Indentation per level in pixels
   * @default 32
   */
  indentSize?: number;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /**
   * Custom styles for each node type
   */
  nodeStyles?: Partial<Record<string, NodeStyleConfig>>;

  /**
   * Font size configuration
   */
  fontSizes?: {
    label?: number;
    content?: number;
  };

  /**
   * Enable dark mode
   * @default false
   */
  darkMode?: boolean;

  /**
   * Animation duration in milliseconds
   * @default 300
   */
  animationDuration?: number;
}

/**
 * Renderer options
 */
export interface RenderOptions {
  /**
   * Debounce delay in milliseconds
   * Batches high-frequency updates
   * @default 50
   */
  debounceMs?: number;

  /**
   * Node count threshold for performance degradation
   * @default 1000
   */
  maxNodesBeforeDegrade?: number;

  /**
   * Enable incremental rendering
   * @default true
   */
  incremental?: boolean;
}

/**
 * Render event types
 */
export type RenderEventType = 'created' | 'updated' | 'deleted';

/**
 * Render event for change tracking
 */
export interface RenderEvent {
  /**
   * Event type
   */
  type: RenderEventType;

  /**
   * Affected node ID
   */
  nodeId: string;

  /**
   * Node data (for create/update)
   */
  node?: StreamNode;
}

/**
 * Render queue item
 */
export interface RenderQueueItem {
  /**
   * Node ID
   */
  nodeId: string;

  /**
   * Render action
   */
  action: 'create' | 'update' | 'delete';

  /**
   * Queue timestamp
   */
  timestamp: number;
}