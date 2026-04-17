/**
 * Protocol Types Unit Tests
 * Tests for src/protocol/types.ts
 */

import { describe, it, expect } from 'vitest';
import {
  createNodeEvent,
  createStatusEvent,
  createMessageEvent,
  validateEvent,
} from '@tracescope/protocol/types';
import type {
  ProtocolNodeData,
  ProtocolMessageData,
  ProtocolEventAction,
} from '@tracescope/protocol/types';

describe('createNodeEvent', () => {
  it('should create node event with all fields', () => {
    const nodeData: ProtocolNodeData = {
      nodeId: 'node-1',
      nodeType: 'llm',
      name: 'LLM Node',
      status: 'running',
    };

    const event = createNodeEvent('event-1', 'start', nodeData, { custom: 'meta' });

    expect(event.id).toBe('event-1');
    expect(event.type).toBe('node');
    expect(event.action).toBe('start');
    expect(event.data).toEqual(nodeData);
    expect(event.metadata).toEqual({ custom: 'meta' });
    expect(event.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should create node event without metadata', () => {
    const nodeData: ProtocolNodeData = {
      nodeId: 'node-1',
      nodeType: 'tool',
      name: 'Tool',
      status: 'completed',
    };

    const event = createNodeEvent('event-1', 'complete', nodeData);

    expect(event.id).toBe('event-1');
    expect(event.metadata).toBeUndefined();
  });

  it('should set type to node', () => {
    const nodeData: ProtocolNodeData = {
      nodeId: 'node-1',
      nodeType: 'user',
      name: 'User',
      status: 'pending',
    };

    const event = createNodeEvent('event-1', 'start', nodeData);

    expect(event.type).toBe('node');
  });

  it('should support all actions', () => {
    const nodeData: ProtocolNodeData = {
      nodeId: 'node-1',
      nodeType: 'llm',
      name: 'LLM',
      status: 'running',
    };

    const actions: ProtocolEventAction[] = ['start', 'update', 'complete', 'error'];

    actions.forEach((action) => {
      const event = createNodeEvent(`event-${action}`, action, nodeData);
      expect(event.action).toBe(action);
    });
  });

  it('should include token usage if provided', () => {
    const nodeData: ProtocolNodeData = {
      nodeId: 'node-1',
      nodeType: 'llm',
      name: 'LLM',
      status: 'completed',
      tokenUsage: { input: 100, output: 50, total: 150 },
    };

    const event = createNodeEvent('event-1', 'complete', nodeData);

    expect(event.data?.tokenUsage).toEqual({ input: 100, output: 50, total: 150 });
  });

  it('should include model info if provided', () => {
    const nodeData: ProtocolNodeData = {
      nodeId: 'node-1',
      nodeType: 'llm',
      name: 'LLM',
      status: 'running',
      model: 'gpt-4',
    };

    const event = createNodeEvent('event-1', 'start', nodeData);

    expect(event.data?.model).toBe('gpt-4');
  });
});

describe('createStatusEvent', () => {
  it('should create status event with basic fields', () => {
    const event = createStatusEvent('session-1', 'running', {
      completedNodes: 5,
      totalNodes: 10,
    });

    expect(event.id).toBe('status-session-1');
    expect(event.type).toBe('status');
    expect(event.status?.sessionId).toBe('session-1');
    expect(event.status?.status).toBe('running');
    expect(event.status?.completedNodes).toBe(5);
    expect(event.status?.totalNodes).toBe(10);
  });

  it('should set action to start for running status', () => {
    const event = createStatusEvent('session-1', 'running', {});

    expect(event.action).toBe('start');
  });

  it('should set action to complete for completed status', () => {
    const event = createStatusEvent('session-1', 'completed', {});

    expect(event.action).toBe('complete');
  });

  it('should set action to complete for failed status', () => {
    const event = createStatusEvent('session-1', 'failed', {});

    expect(event.action).toBe('complete');
  });

  it('should include optional fields', () => {
    const event = createStatusEvent('session-1', 'running', {
      activeNodeId: 'node-5',
      totalTokens: 1500,
      elapsedTime: 5000,
      estimatedRemaining: 3000,
    });

    expect(event.status?.activeNodeId).toBe('node-5');
    expect(event.status?.totalTokens).toBe(1500);
    expect(event.status?.elapsedTime).toBe(5000);
    expect(event.status?.estimatedRemaining).toBe(3000);
  });

  it('should default completedNodes and totalNodes to 0', () => {
    const event = createStatusEvent('session-1', 'initializing', {});

    expect(event.status?.completedNodes).toBe(0);
    expect(event.status?.totalNodes).toBe(0);
  });
});

describe('createMessageEvent', () => {
  const createMessageData = (overrides = {}): ProtocolMessageData => ({
    messageId: 'msg-1',
    role: 'assistant',
    content: 'Hello!',
    contentType: 'text',
    createdAt: Date.now(),
    ...overrides,
  });

  it('should create message event', () => {
    const msgData = createMessageData();

    const event = createMessageEvent(msgData, 'update');

    expect(event.id).toBe('msg-msg-1');
    expect(event.type).toBe('message');
    expect(event.action).toBe('update');
    expect(event.message).toEqual(msgData);
  });

  it('should default action to update', () => {
    const msgData = createMessageData();

    const event = createMessageEvent(msgData);

    expect(event.action).toBe('update');
  });

  it('should use message createdAt as timestamp', () => {
    const timestamp = 1234567890;
    const msgData = createMessageData({ createdAt: timestamp });

    const event = createMessageEvent(msgData);

    expect(event.timestamp).toBe(timestamp);
  });

  it('should include isStreaming flag', () => {
    const msgData = createMessageData({ isStreaming: true });

    const event = createMessageEvent(msgData);

    expect(event.message?.isStreaming).toBe(true);
  });

  it('should support all roles', () => {
    const roles: Array<ProtocolMessageData['role']> = [
      'user',
      'assistant',
      'system',
      'tool',
    ];

    roles.forEach((role) => {
      const msgData = createMessageData({ role });
      const event = createMessageEvent(msgData);
      expect(event.message?.role).toBe(role);
    });
  });

  it('should support all content types', () => {
    const contentTypes: Array<ProtocolMessageData['contentType']> = [
      'text',
      'markdown',
      'code',
      'image',
      'json',
      'tool_call',
    ];

    contentTypes.forEach((contentType) => {
      const msgData = createMessageData({ contentType });
      const event = createMessageEvent(msgData);
      expect(event.message?.contentType).toBe(contentType);
    });
  });

  it('should include attachments', () => {
    const msgData = createMessageData({
      attachments: [
        { type: 'image', url: 'https://example.com/image.png', name: 'image.png' },
      ],
    });

    const event = createMessageEvent(msgData);

    expect(event.message?.attachments).toHaveLength(1);
    expect(event.message?.attachments?.[0].type).toBe('image');
  });
});

describe('validateEvent', () => {
  it('should validate correct event', () => {
    const event = {
      id: 'event-1',
      type: 'node',
      action: 'start',
      timestamp: Date.now(),
    };

    expect(validateEvent(event)).toBe(true);
  });

  it('should validate event with data', () => {
    const event = {
      id: 'event-1',
      type: 'node',
      action: 'complete',
      timestamp: Date.now(),
      data: {
        nodeId: 'node-1',
        nodeType: 'llm',
        name: 'LLM',
        status: 'completed',
      },
    };

    expect(validateEvent(event)).toBe(true);
  });

  it('should reject null', () => {
    expect(validateEvent(null)).toBe(false);
  });

  it('should reject undefined', () => {
    expect(validateEvent(undefined)).toBe(false);
  });

  it('should reject non-object (string)', () => {
    expect(validateEvent('string')).toBe(false);
  });

  it('should reject non-object (number)', () => {
    expect(validateEvent(123)).toBe(false);
  });

  it('should reject non-object (array)', () => {
    expect(validateEvent(['array'])).toBe(false);
  });

  it('should reject missing id', () => {
    const event = {
      type: 'node',
      action: 'start',
      timestamp: Date.now(),
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should reject empty id', () => {
    const event = {
      id: '',
      type: 'node',
      action: 'start',
      timestamp: Date.now(),
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should reject missing type', () => {
    const event = {
      id: 'event-1',
      action: 'start',
      timestamp: Date.now(),
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should reject invalid type', () => {
    const event = {
      id: 'event-1',
      type: 'invalid',
      action: 'start',
      timestamp: Date.now(),
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should reject missing action', () => {
    const event = {
      id: 'event-1',
      type: 'node',
      timestamp: Date.now(),
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should reject invalid action', () => {
    const event = {
      id: 'event-1',
      type: 'node',
      action: 'invalid',
      timestamp: Date.now(),
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should reject missing timestamp', () => {
    const event = {
      id: 'event-1',
      type: 'node',
      action: 'start',
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should reject non-number timestamp', () => {
    const event = {
      id: 'event-1',
      type: 'node',
      action: 'start',
      timestamp: '12345',
    };

    expect(validateEvent(event)).toBe(false);
  });

  it('should validate all valid types', () => {
    const types = ['node', 'edge', 'status', 'message'];

    types.forEach((type) => {
      const event = {
        id: 'event-1',
        type,
        action: 'start',
        timestamp: Date.now(),
      };
      expect(validateEvent(event)).toBe(true);
    });
  });

  it('should validate all valid actions', () => {
    const actions = ['start', 'update', 'complete', 'error'];

    actions.forEach((action) => {
      const event = {
        id: 'event-1',
        type: 'node',
        action,
        timestamp: Date.now(),
      };
      expect(validateEvent(event)).toBe(true);
    });
  });
});
