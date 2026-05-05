import type React from 'react';

export interface AgentFlowProps {
  /** SSE endpoint URL */
  url: string;
  /** Theme: 'light' | 'dark' */
  theme?: 'light' | 'dark';
  /** Auto connect on mount */
  autoConnect?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Connection status callback */
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  /** Max events to keep in memory (default: 100000) */
  maxEvents?: number;
  /** Custom renderer for event messages (overrides default markdown) */
  renderMessage?: (message: string) => React.ReactNode;
  /** Custom renderer for tool results (overrides default markdown) */
  renderResult?: (result: string) => React.ReactNode;
  /** View mode: 'list' (card style) or 'timeline' (collapsible timeline) */
  viewMode?: 'list' | 'timeline';
  /** Whether new events are collapsed by default in timeline mode */
  defaultCollapsed?: boolean;
}

export interface FlowEvent {
  /** Unique event ID */
  id: number;
  /** Event type */
  type: 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';
  /** Event message */
  message?: string;
  /** Tool name (for tool_call) */
  tool?: string;
  /** Tool arguments */
  args?: Record<string, unknown>;
  /** Tool result */
  result?: string;
  /** Timestamp */
  timestamp?: number;
  /** Pre-serialized args for performance */
  argsJson?: string;
  /** Agent name (for multi-agent systems) */
  agentName?: string;
  /** Agent color (hex format, e.g. #3b82f6) */
  agentColor?: string;
  /** Cost in USD (optional) */
  cost?: number;
  /** Token count (optional) */
  tokens?: number;
  /** Duration in milliseconds (optional) */
  duration?: number;
}
