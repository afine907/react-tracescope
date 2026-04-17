/**
 * SSE Connection Manager
 * Handles SSE connection lifecycle, reconnection, and message processing
 */

import type { SSEManagerConfig, ConnectionState } from '../../types/config';
import type { SSEStreamMessage } from '../../types/message';
import { parseSSEMessage, validateMessage } from './parser';

interface SSEManagerEvents {
  message: (message: SSEStreamMessage) => void;
  error: (error: Error) => void;
  stateChange: (state: ConnectionState) => void;
}

/**
 * Debug flag for development
 * Set to false in production to reduce console noise
 */
const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * Conditional debug logging
 */
function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[TraceScope SSE]', ...args);
  }
}

/**
 * SSE Manager class
 * Manages Server-Sent Events connection with auto-reconnect capability
 */
export class SSEManager {
  private config: Required<SSEManagerConfig>;
  private eventSource: EventSource | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private seenMessageIds: Set<string> = new Set();
  private lastSeqNumber = 0;
  private events: SSEManagerEvents;
  private isManuallyClosed = false;

  /**
   * Create a new SSE Manager instance
   * @param config - Configuration for SSE connection
   */
  constructor(config: SSEManagerConfig) {
    this.config = {
      url: config.url,
      headers: config.headers || {},
      reconnectInterval: config.reconnectInterval || 1000,
      maxReconnectInterval: config.maxReconnectInterval || 30000,
      onMessage: config.onMessage || (() => {}),
      onError: config.onError || (() => {}),
      onStateChange: config.onStateChange || (() => {}),
      queryParams: config.queryParams || {},
    };

    this.events = {
      message: this.config.onMessage,
      error: this.config.onError,
      stateChange: this.config.onStateChange,
    };
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.eventSource) {
        this.disconnect();
      }

      this.isManuallyClosed = false;
      this.setState('connecting');

      // Build URL with query parameters
      const url = this.buildURL();

      try {
        this.eventSource = new EventSource(url, {
          withCredentials: false,
        });

        this.eventSource.onopen = () => {
          debugLog('SSE connection established');
          this.reconnectAttempts = 0;
          this.setState('connected');
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.eventSource.onerror = (error) => {
          console.error('[TraceScope] SSE connection error:', error);
          this.handleError(error);
          if (this.state !== 'connected') {
            reject(new Error('Failed to connect to SSE endpoint'));
          }
        };

        // Set connection timeout
        setTimeout(() => {
          if (this.state === 'connecting') {
            this.eventSource?.close();
            this.setState('error');
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    this.isManuallyClosed = true;
    this.clearReconnectTimer();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState('disconnected');
  }

  /**
   * Reconnect to SSE endpoint
   */
  reconnect(): void {
    if (this.isManuallyClosed) {
      return;
    }

    this.disconnect();
    this.connect().catch((error) => {
      debugLog('Reconnection failed:', error.message);
    });
  }

  /**
   * Reset connection and clear all cached data
   */
  reset(): void {
    this.disconnect();
    this.seenMessageIds.clear();
    this.lastSeqNumber = 0;
    this.reconnectAttempts = 0;
    this.isManuallyClosed = false;
  }

  /**
   * Clean up resources (call on unmount)
   */
  destroy(): void {
    this.disconnect();
    this.seenMessageIds.clear();
    this.clearReconnectTimer();
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Update message handler
   */
  onMessage(handler: (message: SSEStreamMessage) => void): void {
    this.events.message = handler;
  }

  /**
   * Update error handler
   */
  onError(handler: (error: Error) => void): void {
    this.events.error = handler;
  }

  /**
   * Update state change handler
   */
  onStateChange(handler: (state: ConnectionState) => void): void {
    this.events.stateChange = handler;
  }

  /**
   * Build URL with query parameters
   */
  private buildURL(): string {
    const url = new URL(this.config.url);
    
    Object.entries(this.config.queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value ?? "");
    });

    return url.toString();
  }

  /**
   * Handle incoming message
   */
  private handleMessage(rawData: string): void {
    if (!rawData || rawData.trim() === '') {
      return;
    }

    // Parse the message
    const message = parseSSEMessage(rawData);
    if (!message) {
      return;
    }

    // Validate message structure
    const validation = validateMessage(message);
    if (!validation.valid) {
      console.warn('[TraceScope] Invalid message:', validation.error);
      return;
    }

    // Check for duplicate messages
    if (this.seenMessageIds.has(message.msgId)) {
      console.warn('[TraceScope] Duplicate message:', message.msgId);
      return;
    }

    // Check sequence number for ordering
    if (message.seq <= this.lastSeqNumber) {
      console.warn('[TraceScope] Out-of-order message:', message.seq, '<=', this.lastSeqNumber);
      // Still process it but log warning
    }
    this.lastSeqNumber = message.seq;

    // Mark as seen
    this.seenMessageIds.add(message.msgId);

    // Limit seen message cache size with time-based eviction
    // Keep only last 5000 message IDs to prevent memory bloat
    if (this.seenMessageIds.size > 5000) {
      // Use Set iterator order (insertion order) to remove oldest entries
      const entries = Array.from(this.seenMessageIds);
      const toRemove = entries.slice(0, 2500); // Remove oldest 50%
      toRemove.forEach(id => this.seenMessageIds.delete(id));
    }

    // Emit valid message
    this.events.message(message as SSEStreamMessage);
  }

  /**
   * Handle connection error
   */
  private handleError(error: unknown): void {
    this.events.error(error instanceof Error ? error : new Error('SSE connection error'));
    
    if (!this.isManuallyClosed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isManuallyClosed) {
      return;
    }

    this.clearReconnectTimer();
    this.setState('connecting');

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectInterval
    );

    debugLog(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnect();
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Update connection state and emit event
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.events.stateChange(state);
    }
  }
}

/**
 * Create SSE Manager factory function
 */
export function createSSEManager(config: SSEManagerConfig): SSEManager {
  return new SSEManager(config);
}