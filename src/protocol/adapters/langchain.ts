/**
 * LangChain 适配器
 * 
 * 将 LangChain 的 trace 格式转换为 TraceScope 标准协议格式
 * 
 * LangChain 的 trace 格式:
 * {
 *   "id": ["chain:", "RunnableSequence", "chain"],
 *   "name": "RunnableSequence",
 *   "input": "...",
 *   "output": "...",
 *   "start_time": 1234567890,
 *   "end_time": 1234567891,
 *   "children": [...]
 * }
 */

import type { 
  ProtocolEvent, 
  ProtocolEventAction,
  ProtocolNodeType, 
  ProtocolAdapter,
  ProtocolNodeData
} from '../types';

// ============================================
// 类型定义
// ============================================

interface LangChainNode {
  id?: string[];
  name?: string;
  input?: unknown;
  output?: unknown;
  start_time?: number;
  end_time?: number;
  children?: LangChainNode[];
  // LangChain specific
  llm_output?: {
    token_usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    model_name?: string;
  };
  run_id?: string;
}

type LangChainTrace = LangChainNode | LangChainNode[];

// ============================================
// 工具函数
// ============================================

/**
 * 检测节点类型
 */
function detectLangChainNodeType(node: LangChainNode): ProtocolNodeType {
  const name = node.name?.toLowerCase() || '';
  const id = node.id?.join(':')?.toLowerCase() || '';
  
  if (id.includes('llm') || id.includes('chatmodel') || id.includes('chatopenai')) {
    return 'llm';
  }
  if (id.includes('tool') || id.includes('bind')) {
    return 'tool';
  }
  if (id.includes('retrieval') || id.includes('vectorstore') || id.includes('retriever')) {
    return 'retrieval';
  }
  if (id.includes('function') || id.includes('parrot')) {
    return 'function';
  }
  
  return 'custom';
}

/**
 * 递归转换节点
 */
function convertNode(
  node: LangChainNode, 
  parentId: string | undefined,
  events: ProtocolEvent[],
  indexMap: Map<string, number>
): void {
  const nodeId = node.id?.join(':') || node.name || `node-${Math.random()}`;
  const nodeType = detectLangChainNodeType(node);
  
  // start 事件
  const startEvent: ProtocolEvent = {
    id: `${nodeId}-start`,
    type: 'node',
    action: 'start',
    timestamp: node.start_time ? node.start_time * 1000 : Date.now(),
    data: {
      nodeId,
      parentId,
      nodeType,
      name: node.name || node.id?.[1] || 'Unknown',
      status: 'running',
      input: node.input,
      startTime: node.start_time ? node.start_time * 1000 : undefined,
    },
  };
  
  // LLM 特殊处理
  if (node.llm_output) {
    const tokenUsage = node.llm_output.token_usage;
    if (tokenUsage) {
      startEvent.data!.tokenUsage = {
        input: tokenUsage.prompt_tokens || 0,
        output: tokenUsage.completion_tokens || 0,
        total: tokenUsage.total_tokens || 0,
      };
    }
    if (node.llm_output.model_name) {
      startEvent.data!.model = node.llm_output.model_name;
    }
  }
  
  events.push(startEvent);
  indexMap.set(nodeId, events.length - 1);
  
  // complete 事件
  if (node.end_time) {
    const completeEvent: ProtocolEvent = {
      id: `${nodeId}-complete`,
      type: 'node',
      action: 'complete',
      timestamp: node.end_time * 1000,
      data: {
        nodeId,
        parentId,
        nodeType,
        name: node.name || node.id?.[1] || 'Unknown',
        status: 'completed',
        output: node.output,
        endTime: node.end_time * 1000,
      },
    };
    
    if (node.llm_output?.token_usage) {
      completeEvent.data!.tokenUsage = {
        input: node.llm_output.token_usage.prompt_tokens || 0,
        output: node.llm_output.token_usage.completion_tokens || 0,
        total: node.llm_output.token_usage.total_tokens || 0,
      };
    }
    
    events.push(completeEvent);
  }
  
  // 递归处理子节点
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => convertNode(child, nodeId, events, indexMap));
  }
}

// ============================================
// 适配器实现
// ============================================

export const langchainAdapter: ProtocolAdapter = {
  name: 'langchain',
  version: '0.1.0',
  
  transform(nativeTrace: LangChainTrace): ProtocolEvent[] {
    const events: ProtocolEvent[] = [];
    const indexMap = new Map<string, number>();
    
    if (Array.isArray(nativeTrace)) {
      nativeTrace.forEach((node) => convertNode(node, undefined, events, indexMap));
    } else if (nativeTrace) {
      convertNode(nativeTrace, undefined, events, indexMap);
    }
    
    return events;
  },
  
  extractEvents(rawData: string | object): ProtocolEvent[] {
    if (typeof rawData === 'string') {
      try {
        const parsed = JSON.parse(rawData);
        return this.transform(parsed);
      } catch {
        return [];
      }
    }
    return this.transform(rawData);
  },
};

export default langchainAdapter;