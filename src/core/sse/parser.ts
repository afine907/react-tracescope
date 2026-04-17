/**
 * SSE Message Parser
 * Parses and validates SSE event stream messages
 */

import type { SSEStreamMessage, ValidationResult, MessageType } from '../../types/message';
import type { StreamNode } from '../../types/node';

/**
 * Parse raw SSE data string into message object
 * @param rawData - Raw data string from SSE event
 * @returns Parsed message or null if invalid
 */
export function parseSSEMessage(rawData: string): SSEStreamMessage | null {
  try {
    const parsed = JSON.parse(rawData);
    
    // Validate required fields
    if (!parsed.msgId || !parsed.type || !parsed.data || typeof parsed.seq !== 'number') {
      console.warn('[TraceScope] Missing required fields:', parsed);
      return null;
    }

    // Validate message type
    const validTypes: MessageType[] = ['node_create', 'node_append'];
    if (!validTypes.includes(parsed.type)) {
      console.warn('[TraceScope] Invalid message type:', parsed.type);
      return null;
    }

    return parsed as SSEStreamMessage;
  } catch (error) {
    console.error('[TraceScope] Failed to parse SSE message:', error);
    return null;
  }
}

/**
 * Validate SSE stream message structure
 * @param message - Message to validate
 * @returns Validation result with parsed message or error details
 */
export function validateMessage(message: unknown): ValidationResult {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: { field: 'root', reason: 'Message must be an object' } };
  }

  const msg = message as Record<string, unknown>;

  // Required: msgId
  if (typeof msg.msgId !== 'string' || msg.msgId.length === 0) {
    return { valid: false, error: { field: 'msgId', reason: 'msgId must be a non-empty string' } };
  }

  // Required: type
  const validTypes: MessageType[] = ['node_create', 'node_append'];
  if (!validTypes.includes(msg.type as MessageType)) {
    return { valid: false, error: { field: 'type', reason: 'type must be node_create or node_append' } };
  }

  // Required: data
  if (!msg.data || typeof msg.data !== 'object') {
    return { valid: false, error: { field: 'data', reason: 'data must be an object' } };
  }

  // Required: seq
  if (typeof msg.seq !== 'number' || msg.seq < 0) {
    return { valid: false, error: { field: 'seq', reason: 'seq must be a non-negative number' } };
  }

  // Required: timestamp
  if (typeof msg.timestamp !== 'number' || msg.timestamp <= 0) {
    return { valid: false, error: { field: 'timestamp', reason: 'timestamp must be a positive number' } };
  }

  // Validate data.nodeId (required for both event types)
  const data = msg.data as Record<string, unknown>;
  if (!data.nodeId || typeof data.nodeId !== 'string') {
    return { valid: false, error: { field: 'data.nodeId', reason: 'nodeId must be a non-empty string' } };
  }

  // Validate chunk (required field)
  if (typeof data.chunk !== 'string') {
    return { valid: false, error: { field: 'data.chunk', reason: 'chunk must be a string' } };
  }

  // node_create requires parentId and nodeType
  if (msg.type === 'node_create') {
    if (data.parentId !== undefined && data.parentId !== null && typeof data.parentId !== 'string') {
      return { valid: false, error: { field: 'data.parentId', reason: 'parentId must be string, null, or undefined' } };
    }

    const validNodeTypes = ['user_input', 'assistant_thought', 'tool_call', 'code_execution', 'execution_result', 'final_output'];
    if (data.nodeType && !validNodeTypes.includes(data.nodeType as string)) {
      return { valid: false, error: { field: 'data.nodeType', reason: 'Invalid nodeType' } };
    }
  }

  // Validate status if provided
  if (data.status !== undefined) {
    const validStatuses = ['streaming', 'complete', 'error'];
    if (!validStatuses.includes(data.status as string)) {
      return { valid: false, error: { field: 'data.status', reason: 'Invalid status' } };
    }
  }

  return {
    valid: true,
    message: message as SSEStreamMessage
  };
}

/**
 * Extract node data from validated message
 * @param message - Validated SSE message
 * @returns StreamNode data
 */
export function extractNodeData(message: SSEStreamMessage): StreamNode {
  return message.data;
}

/**
 * Check if message is a node completion event
 * @param message - SSE message
 * @returns true if this is a completion event
 */
export function isCompletionEvent(message: SSEStreamMessage): boolean {
  return (
    message.type === 'node_append' &&
    message.data.status === 'complete' &&
    message.data.chunk === ''
  );
}

/**
 * Check if message is an error event
 * @param message - SSE message
 * @returns true if this is an error event
 */
export function isErrorEvent(message: SSEStreamMessage): boolean {
  return message.data.status === 'error';
}