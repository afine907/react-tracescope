/**
 * TreeBuilder Unit Tests
 * Tests for src/core/tree/index.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TreeBuilder } from '@tracescope/core/tree';
import type { NodeMap } from '@tracescope/types/node';
import { createMockNode } from '../../../mocks/node-data';

describe('TreeBuilder', () => {
  let builder: TreeBuilder;

  const createMockNodeMap = (nodes: Array<{ id: string; parentId?: string | null }>): NodeMap => {
    const map: NodeMap = {};
    const baseTime = Date.now();
    nodes.forEach(({ id, parentId }, index) => {
      map[id] = createMockNode(id, {
        parentId: parentId ?? null,
        createdAt: baseTime + index * 1000, // Deterministic ordering
      });
    });
    return map;
  };

  beforeEach(() => {
    builder = new TreeBuilder();
  });

  describe('buildTree', () => {
    it('should return null for empty node map', () => {
      const result = builder.buildTree({});
      expect(result).toBeNull();
    });

    it('should build single root tree', () => {
      const nodes = createMockNodeMap([
        { id: 'root' },
        { id: 'child-1', parentId: 'root' },
        { id: 'child-2', parentId: 'root' },
      ]);

      const tree = builder.buildTree(nodes);

      expect(tree).not.toBeNull();
      expect(tree?.nodeId).toBe('root');
      expect(tree?.children.length).toBe(2);
    });

    it('should create virtual root for multiple root nodes', () => {
      const nodes = createMockNodeMap([
        { id: 'root-1' },
        { id: 'root-2' },
      ]);

      const tree = builder.buildTree(nodes);

      expect(tree?.nodeId).toBe('__virtual_root__');
      expect(tree?.children.length).toBe(2);
      expect(tree?.depth).toBe(-1);
    });

    it('should set correct depth for nested nodes', () => {
      const nodes = createMockNodeMap([
        { id: 'level-0' },
        { id: 'level-1', parentId: 'level-0' },
        { id: 'level-2', parentId: 'level-1' },
      ]);

      const tree = builder.buildTree(nodes);

      expect(tree?.depth).toBe(0);
      expect(tree?.children[0]?.depth).toBe(1);
      expect(tree?.children[0]?.children[0]?.depth).toBe(2);
    });

    it('should sort children by createdAt', () => {
      const now = Date.now();
      const nodes: NodeMap = {
        root: { ...createMockNode('root'), createdAt: now },
        'child-a': { ...createMockNode('child-a', { parentId: 'root' }), createdAt: now + 100 },
        'child-b': { ...createMockNode('child-b', { parentId: 'root' }), createdAt: now + 50 },
      };

      const tree = builder.buildTree(nodes);

      // Should be sorted by createdAt: child-b (now+50) -> child-a (now+100)
      expect(tree?.children[0]?.nodeId).toBe('child-b');
      expect(tree?.children[1]?.nodeId).toBe('child-a');
    });

    it('should build deep nested tree', () => {
      const nodes = createMockNodeMap([
        { id: 'a' },
        { id: 'b', parentId: 'a' },
        { id: 'c', parentId: 'b' },
        { id: 'd', parentId: 'c' },
        { id: 'e', parentId: 'd' },
      ]);

      const tree = builder.buildTree(nodes);

      expect(tree?.nodeId).toBe('a');
      expect(tree?.children[0]?.nodeId).toBe('b');
      expect(tree?.children[0]?.children[0]?.nodeId).toBe('c');
      expect(tree?.children[0]?.children[0]?.children[0]?.nodeId).toBe('d');
      expect(tree?.children[0]?.children[0]?.children[0]?.children[0]?.nodeId).toBe('e');
    });

    it('should set defaultExpanded option', () => {
      const nodes = createMockNodeMap([{ id: 'root' }]);

      const tree = builder.buildTree(nodes, { defaultExpanded: false });

      expect(tree?.isExpanded).toBe(false);
    });
  });

  describe('addNode', () => {
    it('should add node to existing tree', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));

      builder.addNode(createMockNode('child', { parentId: 'root' }));

      const root = builder.getRoot();
      expect(root?.children.length).toBe(1);
      expect(root?.children[0]?.nodeId).toBe('child');
    });

    it('should create new tree if none exists', () => {
      const result = builder.addNode(createMockNode('new-root'));

      expect(result?.nodeId).toBe('new-root');
      expect(builder.getNodeCount()).toBe(1);
    });

    it('should add orphan to root children when parent not found', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));

      builder.addNode(createMockNode('orphan', { parentId: 'non-existent' }));

      const root = builder.getRoot();
      expect(root?.children.length).toBe(1);
      expect(root?.children[0]?.nodeId).toBe('orphan');
    });
  });

  describe('findNode', () => {
    it('should find node by ID', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child', parentId: 'root' },
      ]));

      const node = builder.findNode('child');

      expect(node).not.toBeNull();
      expect(node?.nodeId).toBe('child');
    });

    it('should return null for non-existent node', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));

      expect(builder.findNode('non-existent')).toBeNull();
    });
  });

  describe('traverse', () => {
    beforeEach(() => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child-1', parentId: 'root' },
        { id: 'child-2', parentId: 'root' },
        { id: 'grandchild', parentId: 'child-1' },
      ]));
    });

    it('should traverse DFS in correct order', () => {
      const visited: string[] = [];

      builder.traverse('DFS', (node) => {
        visited.push(node.nodeId);
      });

      // DFS order: root -> child-1 -> grandchild -> child-2
      // (child-2 comes after child-1's subtree because of createdAt sorting)
      expect(visited[0]).toBe('root');
      expect(visited[1]).toBe('child-1');
      expect(visited[2]).toBe('grandchild');
      expect(visited[3]).toBe('child-2');
      expect(visited.length).toBe(4);
    });

    it('should traverse BFS in correct order', () => {
      const visited: string[] = [];

      builder.traverse('BFS', (node) => {
        visited.push(node.nodeId);
      });

      // BFS order: root -> child-1 -> child-2 -> grandchild
      expect(visited[0]).toBe('root');
      expect(visited[1]).toBe('child-1');
      expect(visited[2]).toBe('child-2');
      expect(visited[3]).toBe('grandchild');
      expect(visited.length).toBe(4);
    });

    it('should abort traversal on false return', () => {
      const visited: string[] = [];

      builder.traverse('DFS', (node) => {
        visited.push(node.nodeId);
        if (node.nodeId === 'child-1') return false;
        return true;
      });

      expect(visited.length).toBe(2); // root + child-1
    });
  });

  describe('getPath', () => {
    it('should return path from root to node', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child', parentId: 'root' },
        { id: 'grandchild', parentId: 'child' },
      ]));

      const path = builder.getPath('grandchild');

      expect(path).toContain('root');
      expect(path).toContain('child');
      expect(path).toContain('grandchild');
    });

    it('should return empty array for non-existent node', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));

      expect(builder.getPath('non-existent')).toEqual([]);
    });
  });

  describe('toggleExpanded / setExpanded', () => {
    beforeEach(() => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));
    });

    it('should toggle expansion state', () => {
      const initial = builder.findNode('root')?.isExpanded;
      const toggled = builder.toggleExpanded('root');

      expect(toggled).toBe(!initial);
    });

    it('should return null for non-existent node', () => {
      expect(builder.toggleExpanded('non-existent')).toBeNull();
    });

    it('should set specific expansion state', () => {
      builder.setExpanded('root', false);
      expect(builder.findNode('root')?.isExpanded).toBe(false);

      builder.setExpanded('root', true);
      expect(builder.findNode('root')?.isExpanded).toBe(true);
    });

    it('should return false if state unchanged', () => {
      builder.setExpanded('root', true);
      const result = builder.setExpanded('root', true);

      expect(result).toBe(false);
    });
  });

  describe('getChildren', () => {
    it('should return children of a node', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child-1', parentId: 'root' },
        { id: 'child-2', parentId: 'root' },
      ]));

      const children = builder.getChildren('root');

      expect(children.length).toBe(2);
      expect(children.map(c => c.nodeId)).toContain('child-1');
      expect(children.map(c => c.nodeId)).toContain('child-2');
    });

    it('should return empty array for non-existent node', () => {
      expect(builder.getChildren('non-existent')).toEqual([]);
    });
  });

  describe('getDepth', () => {
    it('should return depth of a node', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child', parentId: 'root' },
      ]));

      expect(builder.getDepth('root')).toBe(0);
      expect(builder.getDepth('child')).toBe(1);
    });

    it('should return -1 for non-existent node', () => {
      expect(builder.getDepth('non-existent')).toBe(-1);
    });
  });

  describe('updateNode', () => {
    it('should update node data', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));

      const result = builder.updateNode('root', { chunk: 'Updated' });

      expect(result).toBe(true);
      expect(builder.findNode('root')?.data.chunk).toBe('Updated');
    });

    it('should return false for non-existent node', () => {
      expect(builder.updateNode('non-existent', { chunk: 'Test' })).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear the tree', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child', parentId: 'root' },
      ]));

      builder.clear();

      expect(builder.getRoot()).toBeNull();
      expect(builder.getNodeCount()).toBe(0);
    });
  });

  describe('getNodeCount', () => {
    it('should return total node count', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child-1', parentId: 'root' },
        { id: 'child-2', parentId: 'root' },
      ]));

      expect(builder.getNodeCount()).toBe(3);
    });
  });

  describe('getRootNodes', () => {
    it('should return all root-level nodes', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root-1' },
        { id: 'root-2' },
      ]));

      const rootNodes = builder.getRootNodes();

      // With virtual root, getRootNodes returns children of virtual root
      expect(rootNodes.length).toBe(2);
    });
  });

  describe('getAllDescendants', () => {
    it('should return all descendants of a node', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'child-1', parentId: 'root' },
        { id: 'child-2', parentId: 'root' },
        { id: 'grandchild', parentId: 'child-1' },
        { id: 'great-grandchild', parentId: 'grandchild' },
      ]));

      const descendants = builder.getAllDescendants('child-1');

      // Should only return actual descendants: grandchild, great-grandchild
      expect(descendants.length).toBe(2);
      expect(descendants.map(d => d.nodeId)).toEqual(['grandchild', 'great-grandchild']);
    });

    it('should return empty array for leaf node', () => {
      builder.buildTree(createMockNodeMap([
        { id: 'root' },
        { id: 'leaf', parentId: 'root' },
      ]));

      const descendants = builder.getAllDescendants('leaf');

      expect(descendants).toEqual([]);
    });

    it('should return empty array for non-existent node', () => {
      expect(builder.getAllDescendants('non-existent')).toEqual([]);
    });
  });

  describe('isTreeDirty', () => {
    it('should be false after build', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));

      expect(builder.isTreeDirty()).toBe(false);
    });

    it('should be true after addNode', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));
      builder.addNode(createMockNode('child', { parentId: 'root' }));

      expect(builder.isTreeDirty()).toBe(true);
    });

    it('should be true after updateNode', () => {
      builder.buildTree(createMockNodeMap([{ id: 'root' }]));
      builder.updateNode('root', { chunk: 'Updated' });

      expect(builder.isTreeDirty()).toBe(true);
    });
  });
});
