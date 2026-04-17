/**
 * Immutable Utilities Unit Tests
 * Tests for src/core/state/immutable.ts
 */

import { describe, it, expect } from 'vitest';
import {
  createNode,
  copyNodeMap,
  updateNodeImmutable,
  addNodeImmutable,
  removeNodeImmutable,
  appendContentImmutable,
  evictOldestNodes,
  filterNodesByAgent,
  getNodesSortedByTime,
  deepCloneNode,
} from '@tracescope/core/state/immutable';
import type { StreamNode, NodeMap } from '@tracescope/types/node';
import { mockConsole } from '../../../setup';
import { createMockNode } from '../../../mocks/node-data';

describe('createNode', () => {
  it('should create node with defaults', () => {
    const node = createNode('node-1');

    expect(node.nodeId).toBe('node-1');
    expect(node.parentId).toBeNull();
    expect(node.chunk).toBe('');
    expect(node.status).toBe('streaming');
    expect(node.createdAt).toBeDefined();
    expect(node.updatedAt).toBeDefined();
  });

  it('should merge partial data', () => {
    const node = createNode('node-1', {
      parentId: 'parent-1',
      chunk: 'Hello',
      status: 'complete',
    });

    expect(node.nodeId).toBe('node-1');
    expect(node.parentId).toBe('parent-1');
    expect(node.chunk).toBe('Hello');
    expect(node.status).toBe('complete');
  });

  it('should preserve provided timestamps', () => {
    const timestamp = 1234567890;
    const node = createNode('node-1', {
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(node.createdAt).toBe(timestamp);
    expect(node.updatedAt).toBe(timestamp);
  });

  it('should allow undefined nodeType', () => {
    const node = createNode('node-1');

    expect(node.nodeType).toBeUndefined();
  });

  it('should allow custom nodeType', () => {
    const node = createNode('node-1', {
      nodeType: 'tool_call',
    });

    expect(node.nodeType).toBe('tool_call');
  });
});

describe('copyNodeMap', () => {
  it('should create shallow copy', () => {
    const original: NodeMap = {
      'node-1': createMockNode('node-1', { chunk: 'A' }),
    };

    const copy = copyNodeMap(original);

    expect(copy).not.toBe(original);
    expect(copy['node-1']).toBe(original['node-1']); // Shallow copy, same reference
  });

  it('should preserve all nodes', () => {
    const original: NodeMap = {
      'node-1': createMockNode('node-1'),
      'node-2': createMockNode('node-2'),
    };

    const copy = copyNodeMap(original);

    expect(Object.keys(copy).length).toBe(2);
    expect(copy['node-1']).toBeDefined();
    expect(copy['node-2']).toBeDefined();
  });

  it('should handle empty map', () => {
    const copy = copyNodeMap({});

    expect(Object.keys(copy).length).toBe(0);
  });
});

describe('updateNodeImmutable', () => {
  it('should return new map with updated node', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { chunk: 'Original' }),
    };

    const updated = updateNodeImmutable(nodes, 'node-1', { chunk: 'Updated' });

    expect(updated).not.toBe(nodes);
    expect(updated['node-1'].chunk).toBe('Updated');
    expect(nodes['node-1'].chunk).toBe('Original'); // Original unchanged
  });

  it('should return original map if node not found', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
    };

    const result = updateNodeImmutable(nodes, 'non-existent', { chunk: 'Test' });

    expect(result).toBe(nodes); // Same reference
    expect(mockConsole.warn).toHaveBeenCalled();
  });

  it('should update timestamp', () => {
    const oldTimestamp = Date.now() - 10000;
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { updatedAt: oldTimestamp }),
    };

    const updated = updateNodeImmutable(nodes, 'node-1', { chunk: 'Updated' });

    expect(updated['node-1'].updatedAt).toBeGreaterThan(oldTimestamp);
  });

  it('should update status', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { status: 'streaming' }),
    };

    const updated = updateNodeImmutable(nodes, 'node-1', { status: 'complete' });

    expect(updated['node-1'].status).toBe('complete');
    expect(nodes['node-1'].status).toBe('streaming');
  });

  it('should preserve other nodes', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
      'node-2': createMockNode('node-2'),
    };

    const updated = updateNodeImmutable(nodes, 'node-1', { chunk: 'Updated' });

    expect(updated['node-2']).toBe(nodes['node-2']); // Unchanged reference
  });
});

describe('addNodeImmutable', () => {
  it('should add new node', () => {
    const nodes: NodeMap = {};
    const newNode = createMockNode('node-1', { chunk: 'New' });

    const result = addNodeImmutable(nodes, newNode);

    expect(result['node-1']).toBeDefined();
    expect(result['node-1'].chunk).toBe('New');
  });

  it('should not add duplicate node', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { chunk: 'Original' }),
    };
    const newNode = createMockNode('node-1', { chunk: 'New' });

    const result = addNodeImmutable(nodes, newNode);

    expect(result).toBe(nodes); // Same reference
    expect(result['node-1'].chunk).toBe('Original'); // Original preserved
    expect(mockConsole.warn).toHaveBeenCalled();
  });

  it('should set timestamps if not provided', () => {
    const nodes: NodeMap = {};
    const newNode: StreamNode = {
      nodeId: 'node-1',
      parentId: null,
      chunk: 'Test',
      status: 'streaming',
    } as StreamNode;

    const result = addNodeImmutable(nodes, newNode);

    expect(result['node-1'].createdAt).toBeDefined();
    expect(result['node-1'].updatedAt).toBeDefined();
  });

  it('should return new map', () => {
    const nodes: NodeMap = {};
    const newNode = createMockNode('node-1');

    const result = addNodeImmutable(nodes, newNode);

    expect(result).not.toBe(nodes);
  });
});

describe('removeNodeImmutable', () => {
  it('should remove existing node', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
      'node-2': createMockNode('node-2'),
    };

    const result = removeNodeImmutable(nodes, 'node-1');

    expect(result['node-1']).toBeUndefined();
    expect(result['node-2']).toBeDefined();
    expect(Object.keys(result).length).toBe(1);
  });

  it('should return map without the node even if not exists', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
    };

    const result = removeNodeImmutable(nodes, 'non-existent');

    expect(result['node-1']).toBeDefined();
    expect(Object.keys(result).length).toBe(1);
  });

  it('should return new map', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
    };

    const result = removeNodeImmutable(nodes, 'node-1');

    expect(result).not.toBe(nodes);
  });
});

describe('appendContentImmutable', () => {
  it('should append content to existing node', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { chunk: 'Hello' }),
    };

    const result = appendContentImmutable(nodes, 'node-1', ' World');

    expect(result['node-1'].chunk).toBe('Hello World');
  });

  it('should update status when provided', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { chunk: 'Hello', status: 'streaming' }),
    };

    const result = appendContentImmutable(nodes, 'node-1', ' World', 'complete');

    expect(result['node-1'].status).toBe('complete');
  });

  it('should preserve status if not provided', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { chunk: 'Hello', status: 'streaming' }),
    };

    const result = appendContentImmutable(nodes, 'node-1', ' World');

    expect(result['node-1'].status).toBe('streaming');
  });

  it('should return original if node not found', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
    };

    const result = appendContentImmutable(nodes, 'non-existent', 'Test');

    expect(result).toBe(nodes);
    expect(mockConsole.warn).toHaveBeenCalled();
  });

  it('should update timestamp', () => {
    const oldTimestamp = Date.now() - 10000;
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', {
        chunk: 'Hello',
        updatedAt: oldTimestamp,
      }),
    };

    const result = appendContentImmutable(nodes, 'node-1', ' World');

    expect(result['node-1'].updatedAt).toBeGreaterThan(oldTimestamp);
  });
});

describe('evictOldestNodes', () => {
  it('should not evict if under limit', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { createdAt: 1000 }),
      'node-2': createMockNode('node-2', { createdAt: 2000 }),
    };

    const result = evictOldestNodes(nodes, 5);

    expect(Object.keys(result).length).toBe(2);
  });

  it('should evict oldest nodes when over limit', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { createdAt: 1000 }),
      'node-2': createMockNode('node-2', { createdAt: 2000 }),
      'node-3': createMockNode('node-3', { createdAt: 3000 }),
    };

    const result = evictOldestNodes(nodes, 2);

    expect(Object.keys(result).length).toBe(2);
    expect(result['node-1']).toBeUndefined(); // Oldest evicted
    expect(result['node-3']).toBeDefined(); // Newest kept
  });

  it('should handle exact limit', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { createdAt: 1000 }),
      'node-2': createMockNode('node-2', { createdAt: 2000 }),
    };

    const result = evictOldestNodes(nodes, 2);

    expect(Object.keys(result).length).toBe(2);
  });

  it('should handle empty map', () => {
    const result = evictOldestNodes({}, 5);

    expect(Object.keys(result).length).toBe(0);
  });

  it('should return empty map for zero limit', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
    };

    const result = evictOldestNodes(nodes, 0);

    expect(Object.keys(result).length).toBe(0);
  });

  it('should return empty map for negative limit', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1'),
    };

    const result = evictOldestNodes(nodes, -5);

    expect(Object.keys(result).length).toBe(0);
  });
});

describe('filterNodesByAgent', () => {
  it('should filter nodes by agent ID', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { agentId: 'agent-a' }),
      'node-2': createMockNode('node-2', { agentId: 'agent-b' }),
      'node-3': createMockNode('node-3', { agentId: 'agent-a' }),
    };

    const result = filterNodesByAgent(nodes, 'agent-a');

    expect(result.length).toBe(2);
    expect(result.every((n) => n.agentId === 'agent-a')).toBe(true);
  });

  it('should return empty array if no matches', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { agentId: 'agent-a' }),
    };

    const result = filterNodesByAgent(nodes, 'non-existent');

    expect(result).toEqual([]);
  });

  it('should handle empty map', () => {
    const result = filterNodesByAgent({}, 'agent-a');

    expect(result).toEqual([]);
  });

  it('should exclude nodes without agentId', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { agentId: 'agent-a' }),
      'node-2': createMockNode('node-2'), // No agentId
    };

    const result = filterNodesByAgent(nodes, 'agent-a');

    expect(result.length).toBe(1);
    expect(result[0].nodeId).toBe('node-1');
  });
});

describe('getNodesSortedByTime', () => {
  it('should sort ascending by default', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { createdAt: 3000 }),
      'node-2': createMockNode('node-2', { createdAt: 1000 }),
      'node-3': createMockNode('node-3', { createdAt: 2000 }),
    };

    const result = getNodesSortedByTime(nodes);

    expect(result[0].createdAt).toBe(1000);
    expect(result[1].createdAt).toBe(2000);
    expect(result[2].createdAt).toBe(3000);
  });

  it('should sort descending when specified', () => {
    const nodes: NodeMap = {
      'node-1': createMockNode('node-1', { createdAt: 1000 }),
      'node-2': createMockNode('node-2', { createdAt: 3000 }),
    };

    const result = getNodesSortedByTime(nodes, false);

    expect(result[0].createdAt).toBe(3000);
    expect(result[1].createdAt).toBe(1000);
  });

  it('should handle empty map', () => {
    const result = getNodesSortedByTime({});

    expect(result).toEqual([]);
  });

  it('should handle nodes without createdAt', () => {
    const nodes: NodeMap = {
      'node-1': { nodeId: 'node-1' } as StreamNode,
      'node-2': createMockNode('node-2', { createdAt: 1000 }),
    };

    const result = getNodesSortedByTime(nodes);

    expect(result.length).toBe(2);
    // Node without createdAt should have 0 as default
    expect(result.find((n) => n.nodeId === 'node-1')?.createdAt ?? 0).toBe(0);
  });
});

describe('deepCloneNode', () => {
  it('should create deep copy of node', () => {
    const original = createMockNode('node-1', {
      chunk: 'Hello',
      nodeType: 'tool_call',
    });

    const clone = deepCloneNode(original);

    expect(clone).not.toBe(original);
    expect(clone).toEqual(original);
  });

  it('should handle nested objects', () => {
    const original = {
      ...createMockNode('node-1'),
      'x-metadata': { nested: { deep: 'value' } },
    } as StreamNode;

    const clone = deepCloneNode(original);

    expect(clone['x-metadata']).toEqual(original['x-metadata']);
    expect(clone['x-metadata']).not.toBe((original as any)['x-metadata']);
  });

  it('should handle arrays', () => {
    const original = {
      ...createMockNode('node-1'),
      tags: ['tag1', 'tag2'],
    } as StreamNode;

    const clone = deepCloneNode(original);

    expect(clone.tags).toEqual(['tag1', 'tag2']);
    expect(clone.tags).not.toBe((original as any).tags);
  });

  it('should handle null values', () => {
    const original = createMockNode('node-1', {
      parentId: null,
    });

    const clone = deepCloneNode(original);

    expect(clone.parentId).toBeNull();
  });

  it('should fall back to JSON method when structuredClone unavailable', () => {
    // Save original structuredClone
    const originalStructuredClone = globalThis.structuredClone;

    // Remove structuredClone to test fallback path
    // @ts-expect-error - intentionally removing for test
    delete globalThis.structuredClone;

    const node = createMockNode('node-1', {
      chunk: 'Test content',
      nodeType: 'tool_call',
    });

    const clone = deepCloneNode(node);

    // Should still work with JSON fallback
    expect(clone).toEqual(node);
    expect(clone).not.toBe(node);
    expect(clone.chunk).toBe('Test content');

    // Restore structuredClone
    globalThis.structuredClone = originalStructuredClone;
  });
});
