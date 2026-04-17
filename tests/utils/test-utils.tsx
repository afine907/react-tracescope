/**
 * Test Utilities for E2E Component Testing
 * Provides helper functions and render utilities
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import type { TreeNode } from '@tracescope/types/tree';
import type { ProtocolMessageData } from '@tracescope/protocol/types';

/**
 * Custom render function with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, options);
}

/**
 * Create a mock TreeNode for testing
 */
export function createMockTreeNode(
  id: string,
  options: Partial<{
    parentId: string | null;
    nodeType: string;
    chunk: string;
    status: string;
    children: TreeNode[];
    depth: number;
  }> = {}
): TreeNode {
  return {
    nodeId: id,
    data: {
      nodeId: id,
      parentId: options.parentId ?? null,
      nodeType: (options.nodeType as any) ?? 'final_output',
      chunk: options.chunk ?? `Content for ${id}`,
      status: (options.status as any) ?? 'complete',
    },
    children: options.children ?? [],
    depth: options.depth ?? 0,
    isExpanded: true,
  };
}

/**
 * Create a tree structure with multiple levels
 */
export function createMockTree(options: {
  depth?: number;
  childrenPerNode?: number;
  nodeCount?: number;
} = {}): TreeNode {
  const { depth = 2, childrenPerNode = 2 } = options;

  let nodeIdCounter = 0;

  function createNodeAtLevel(level: number): TreeNode {
    const id = `node-${nodeIdCounter++}`;
    const children: TreeNode[] = [];

    if (level < depth) {
      for (let i = 0; i < childrenPerNode; i++) {
        children.push(createNodeAtLevel(level + 1));
      }
    }

    return createMockTreeNode(id, {
      nodeType: level === 0 ? 'user_input' : level === 1 ? 'assistant_thought' : 'tool_call',
      chunk: `Level ${level} - ${id}`,
      status: level === depth ? 'complete' : 'streaming',
      children,
      depth: level,
    });
  }

  return createNodeAtLevel(0);
}

/**
 * Create a flat list of TreeNodes (no children)
 */
export function createFlatTree(count: number): TreeNode {
  const children: TreeNode[] = [];
  for (let i = 0; i < count; i++) {
    children.push(createMockTreeNode(`flat-node-${i}`, {
      nodeType: ['user_input', 'assistant_thought', 'tool_call', 'final_output'][i % 4],
      chunk: `Node ${i} content`,
      depth: 1,
    }));
  }

  return createMockTreeNode('root', {
    nodeType: 'user_input',
    chunk: 'Root node',
    children,
    depth: 0,
  });
}

/**
 * Create mock chat messages
 */
export function createMockMessages(count: number): ProtocolMessageData[] {
  const messages: ProtocolMessageData[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const isUser = i % 2 === 0;
    messages.push({
      messageId: `msg-${i}`,
      role: isUser ? 'user' : 'assistant',
      content: isUser
        ? `User message ${i}`
        : `Assistant response ${i}\n\nWith multiple paragraphs.\n\n- Item 1\n- Item 2`,
      contentType: isUser ? 'text' : 'markdown',
      createdAt: now - (count - i) * 60000,
      tokensReceived: isUser ? undefined : Math.floor(Math.random() * 200) + 50,
    });
  }

  return messages;
}

/**
 * Create streaming message for testing
 */
export function createStreamingMessage(): ProtocolMessageData {
  return {
    messageId: 'streaming-msg',
    role: 'assistant',
    content: 'This is a streaming message...',
    contentType: 'markdown',
    createdAt: Date.now(),
    isStreaming: true,
    tokensReceived: 50,
  };
}

/**
 * Create message with thinking block
 */
export function createMessageWithThinking(): ProtocolMessageData {
  return {
    messageId: 'thinking-msg',
    role: 'assistant',
    content: '<thinking>\nLet me think about this...\nAnalyzing the request...\n</thinking>\n\nHere is my response after thinking.',
    contentType: 'markdown',
    createdAt: Date.now(),
    tokensReceived: 150,
  };
}

/**
 * Wait for condition helper
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Simulate user typing in input
 */
export function simulateUserTyping(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Performance measurement helper
 */
export function measureRenderTime(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

/**
 * Large dataset generator for performance testing
 */
export function generateLargeTree(nodeCount: number): TreeNode {
  const children: TreeNode[] = [];

  for (let i = 0; i < nodeCount; i++) {
    children.push(createMockTreeNode(`perf-node-${i}`, {
      nodeType: ['user_input', 'assistant_thought', 'tool_call', 'code_execution', 'execution_result', 'final_output'][i % 6] as any,
      chunk: `Performance test node ${i}. Contains some content to simulate real data.`,
      status: i % 3 === 0 ? 'streaming' : 'complete',
      depth: 1,
    }));
  }

  return createMockTreeNode('perf-root', {
    nodeType: 'user_input',
    chunk: 'Root for performance testing',
    children,
    depth: 0,
  });
}
