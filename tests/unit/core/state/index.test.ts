/**
 * StateManager Unit Tests
 * Tests for src/core/state/index.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '@tracescope/core/state';
import type { SSEStreamMessage } from '@tracescope/types/message';
import { mockConsole } from '../../../setup';

describe('StateManager', () => {
  let manager: StateManager;
  const onNodeUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new StateManager({ maxNodes: 100, onNodeUpdate });
  });

  describe('handleMessage - node_create', () => {
    it('should create new node', () => {
      const message: SSEStreamMessage = {
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Hello' },
        seq: 1,
        timestamp: Date.now(),
      };

      manager.handleMessage(message);

      expect(manager.hasNode('node-1')).toBe(true);
      expect(manager.getNode('node-1')?.chunk).toBe('Hello');
      expect(onNodeUpdate).toHaveBeenCalledWith('node-1', expect.anything());
    });

    it('should not create duplicate node', () => {
      const message: SSEStreamMessage = {
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Hello' },
        seq: 1,
        timestamp: Date.now(),
      };

      manager.handleMessage(message);
      manager.handleMessage(message);

      expect(manager.getNodeCount()).toBe(1);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should handle node with parent', () => {
      // Create parent first
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'parent', chunk: '' },
        seq: 1,
        timestamp: Date.now(),
      });

      // Create child
      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_create',
        data: { nodeId: 'child', parentId: 'parent', chunk: 'Child' },
        seq: 2,
        timestamp: Date.now(),
      });

      expect(manager.getNode('child')?.parentId).toBe('parent');
    });
  });

  describe('handleMessage - node_append', () => {
    it('should append content to existing node', () => {
      // Create node first
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Hello' },
        seq: 1,
        timestamp: Date.now(),
      });

      // Append content
      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_append',
        data: { nodeId: 'node-1', chunk: ' World' },
        seq: 2,
        timestamp: Date.now(),
      });

      expect(manager.getNode('node-1')?.chunk).toBe('Hello World');
    });

    it('should update status', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '', status: 'streaming' },
        seq: 1,
        timestamp: Date.now(),
      });

      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_append',
        data: { nodeId: 'node-1', chunk: '', status: 'complete' },
        seq: 2,
        timestamp: Date.now(),
      });

      expect(manager.getNode('node-1')?.status).toBe('complete');
    });

    it('should warn for non-existent node', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_append',
        data: { nodeId: 'non-existent', chunk: 'Test' },
        seq: 1,
        timestamp: Date.now(),
      });

      expect(manager.hasNode('non-existent')).toBe(false);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should append content with status update', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Hello', status: 'streaming' },
        seq: 1,
        timestamp: Date.now(),
      });

      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_append',
        data: { nodeId: 'node-1', chunk: ' World', status: 'complete' },
        seq: 2,
        timestamp: Date.now(),
      });

      const node = manager.getNode('node-1');
      expect(node?.chunk).toBe('Hello World');
      expect(node?.status).toBe('complete');
    });
  });

  describe('getNode', () => {
    it('should return node by ID', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Test' },
        seq: 1,
        timestamp: Date.now(),
      });

      const node = manager.getNode('node-1');
      expect(node).toBeDefined();
      expect(node?.chunk).toBe('Test');
    });

    it('should return undefined for non-existent node', () => {
      expect(manager.getNode('non-existent')).toBeUndefined();
    });
  });

  describe('getAllNodes / getNodesArray', () => {
    it('should return all nodes', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 1,
        timestamp: Date.now(),
      });
      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_create',
        data: { nodeId: 'node-2', chunk: '' },
        seq: 2,
        timestamp: Date.now(),
      });

      expect(Object.keys(manager.getAllNodes()).length).toBe(2);
      expect(manager.getNodesArray().length).toBe(2);
    });

    it('should return a copy of nodes map', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 1,
        timestamp: Date.now(),
      });

      const nodes1 = manager.getAllNodes();
      const nodes2 = manager.getAllNodes();

      expect(nodes1).not.toBe(nodes2);
    });
  });

  describe('getNodesByAgent', () => {
    it('should filter by agent ID', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '', agentId: 'agent-a' },
        seq: 1,
        timestamp: Date.now(),
      });
      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_create',
        data: { nodeId: 'node-2', chunk: '', agentId: 'agent-b' },
        seq: 2,
        timestamp: Date.now(),
      });

      const result = manager.getNodesByAgent('agent-a');
      expect(result.length).toBe(1);
      expect(result[0].nodeId).toBe('node-1');
    });

    it('should return empty array for non-existent agent', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 1,
        timestamp: Date.now(),
      });

      expect(manager.getNodesByAgent('non-existent')).toEqual([]);
    });
  });

  describe('updateNode', () => {
    it('should update existing node', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Original' },
        seq: 1,
        timestamp: Date.now(),
      });

      const result = manager.updateNode('node-1', { chunk: 'Updated' });

      expect(result).toBe(true);
      expect(manager.getNode('node-1')?.chunk).toBe('Updated');
    });

    it('should return false for non-existent node', () => {
      expect(manager.updateNode('non-existent', { chunk: 'Test' })).toBe(false);
    });

    it('should trigger onNodeUpdate callback', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 1,
        timestamp: Date.now(),
      });

      onNodeUpdate.mockClear();
      manager.updateNode('node-1', { chunk: 'Updated' });

      expect(onNodeUpdate).toHaveBeenCalled();
    });
  });

  describe('deleteNode', () => {
    it('should delete existing node', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 1,
        timestamp: Date.now(),
      });

      const result = manager.deleteNode('node-1');

      expect(result).toBe(true);
      expect(manager.hasNode('node-1')).toBe(false);
    });

    it('should return false for non-existent node', () => {
      expect(manager.deleteNode('non-existent')).toBe(false);
    });
  });

  describe('node eviction', () => {
    it('should evict oldest nodes when limit reached', () => {
      const smallManager = new StateManager({ maxNodes: 3 });

      for (let i = 0; i < 5; i++) {
        smallManager.handleMessage({
          msgId: `msg-${i}`,
          type: 'node_create',
          data: { nodeId: `node-${i}`, chunk: '' },
          seq: i,
          timestamp: Date.now() + i,
        });
      }

      expect(smallManager.getNodeCount()).toBe(3);
      // Oldest nodes should be evicted
      expect(smallManager.hasNode('node-0')).toBe(false);
      expect(smallManager.hasNode('node-4')).toBe(true);
    });
  });

  describe('event handlers', () => {
    it('should emit node_create event', () => {
      const handler = vi.fn();
      manager.on('node_create', handler);

      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Test' },
        seq: 1,
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'node_create' })
      );
    });

    it('should emit node_append event', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Hello' },
        seq: 1,
        timestamp: Date.now(),
      });

      const handler = vi.fn();
      manager.on('node_append', handler);

      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_append',
        data: { nodeId: 'node-1', chunk: ' World' },
        seq: 2,
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'node_append', nodeId: 'node-1' })
      );
    });

    it('should remove handler with off', () => {
      const handler = vi.fn();
      manager.on('node_create', handler);
      manager.off('node_create');

      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'Test' },
        seq: 1,
        timestamp: Date.now(),
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all nodes', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 1,
        timestamp: Date.now(),
      });

      manager.clear();

      expect(manager.getNodeCount()).toBe(0);
      expect(manager.getLastSeq()).toBe(0);
    });
  });

  describe('getLastSeq', () => {
    it('should return last processed sequence number', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 5,
        timestamp: Date.now(),
      });

      expect(manager.getLastSeq()).toBe(5);
    });
  });

  describe('out-of-order messages', () => {
    it('should still process out-of-order messages', () => {
      // First message with seq 10
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: 'First' },
        seq: 10,
        timestamp: Date.now(),
      });

      // Out-of-order message with seq 5 (should still be processed)
      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_create',
        data: { nodeId: 'node-2', chunk: 'Second' },
        seq: 5,
        timestamp: Date.now(),
      });

      // Both nodes should exist
      expect(manager.hasNode('node-1')).toBe(true);
      expect(manager.hasNode('node-2')).toBe(true);
      // Note: lastProcessedSeq is updated to the last message's seq (5),
      // not the maximum. This is intentional for detecting out-of-order messages.
      expect(manager.getLastSeq()).toBe(5);
    });

    it('should warn on out-of-order messages', () => {
      manager.handleMessage({
        msgId: 'msg-1',
        type: 'node_create',
        data: { nodeId: 'node-1', chunk: '' },
        seq: 10,
        timestamp: Date.now(),
      });

      mockConsole.warn.mockClear();

      manager.handleMessage({
        msgId: 'msg-2',
        type: 'node_create',
        data: { nodeId: 'node-2', chunk: '' },
        seq: 5,
        timestamp: Date.now(),
      });

      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });
});
