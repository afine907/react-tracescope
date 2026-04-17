/**
 * SSE message type definitions
 * Protocol structures for server-sent events communication
 */

import type { StreamNode } from './node';

/**
 * Message event types
 * Covers all possible message scenarios
 */
export type MessageType = 'node_create' | 'node_append';

/**
 * Full SSE stream message structure
 * Follows the protocol specification for agent-to-frontend communication
 */
export interface SSEStreamMessage {
  /**
   * Globally unique message identifier
   * UUID format, used for deduplication and loss tracking
   */
  msgId: string;

  /**
   * Event type for routing to appropriate handler
   * node_create: new node creation
   * node_append: content append or status update
   */
  type: MessageType;

  /**
   * Node data payload
   * Content varies based on message type
   */
  data: StreamNode;

  /**
   * Sequence number for ordering
   * Auto-incrementing number prevents message disorder
   */
  seq: number;

  /**
   * Message timestamp (milliseconds)
   * 13-digit Unix timestamp
   */
  timestamp: number;

  /**
   * Protocol version for backward compatibility
   * Semantic versioning, defaults to v1.0.0 if omitted
   */
  protocolVersion?: string;
}

/**
 * Error event structure
 * Sent when server-side errors occur
 */
export interface SSEErrorMessage {
  /**
   * Error code identifying the error type
   */
  code: string;

  /**
   * Human-readable error description
   */
  message: string;

  /**
   * Error occurrence timestamp (milliseconds)
   */
  timestamp: number;
}

/**
 * Parsed SSE message container
 * Raw message before validation
 */
export interface RawSSEMessage {
  /**
   * Raw data string from SSE event
   */
  raw: string;

  /**
   * Parsed JSON object (if valid)
   */
  parsed?: SSEStreamMessage;

  /**
   * Parse error details (if invalid)
   */
  parseError?: Error;
}

/**
 * Message validation result
 */
export interface ValidationResult {
  /**
   * Whether the message is valid
   */
  valid: boolean;

  /**
   * Parsed message if valid
   */
  message?: SSEStreamMessage;

  /**
   * Validation error details if invalid
   */
  error?: {
    field: string;
    reason: string;
  };
}