/**
 * AutoGen 适配器
 * 
 * 将 AutoGen 的 trace 格式转换为 TraceScope 标准协议格式
 * 
 * AutoGen 事件类型:
 * - agent_message: Agent 间消息传递
 * - function_call: 工具/函数调用
 * - llm_response: LLM 响应
 * - code_execution: 代码执行
 * - agent_start / agent_end: Agent 生命周期
 */

import type { 
  ProtocolEvent, 
  ProtocolEventAction,
  ProtocolNodeType, 
  ProtocolNodeStatus,
  ProtocolAdapter,
  ProtocolNodeData,
  ProtocolMessageData
} from '../types';

// ============================================
// 类型定义
// ============================================

/**
 * AutoGen 原始事件格式
 */
interface AutoGenEvent {
  /** 事件类型 */
  event: string;
  
  /** 发送者 */
  sender?: string;
  
  /** 接收者 */
  receiver?: string;
  
  /** 消息内容 */
  content?: string;
  
  /** 时间戳 */
  timestamp?: number;
  
  /** Agent 名称 */
  agent?: string;
  
  /** 函数名 */
  function?: string;
  
  /** 函数参数 */
  arguments?: Record<string, unknown>;
  
  /** 函数结果 */
  result?: string;
  
  /** LLM 模型 */
  model?: string;
  
  /** 输入 Token */
  prompt_tokens?: number;
  
  /** 输出 Token */
  completion_tokens?: number;
  
  /** LLM 响应内容 */
  response?: string;
  
  /** 是否为流式 */
  is_streaming?: boolean;
  
  /** 错误信息 */
  error?: string;
  
  /** 额外元数据 */
  metadata?: Record<string, unknown>;
  
  // 嵌套子事件
  children?: AutoGenEvent[];
}

/**
 * AutoGen Trace 输入类型
 */
type AutoGenTrace = AutoGenEvent | AutoGenEvent[] | { events: AutoGenEvent[] };

/**
 * 节点关系图
 */
interface NodeGraph {
  nodes: Map<string, ProtocolNodeData>;
  edges: Array<{ sourceId: string; targetId: string }>;
}

// ============================================
// 工具函数
// ============================================

/**
 * 展平嵌套事件
 */
function flattenEvents(event: AutoGenEvent): AutoGenEvent[] {
  const result: AutoGenEvent[] = [event];
  
  if (event.children) {
    event.children.forEach(child => {
      result.push(...flattenEvents(child));
    });
  }
  
  return result;
}

/**
 * 获取或创建节点 ID
 */
function getOrCreateNodeId(entity: string | undefined, fallback: string, nodeMap: NodeGraph): string {
  const id = entity || fallback;
  
  if (!nodeMap.nodes.has(id)) {
    nodeMap.nodes.set(id, {
      nodeId: id,
      nodeType: 'custom',
      name: id,
      status: 'pending',
    });
  }
  
  return id;
}

/**
 * 根据事件类型推断节点类型
 */
function inferNodeType(event: AutoGenEvent): ProtocolNodeType {
  const eventType = event.event?.toLowerCase() || '';
  
  if (eventType.includes('llm') || eventType.includes('chat')) {
    return 'llm';
  }
  if (eventType.includes('function') || eventType.includes('tool')) {
    return 'tool';
  }
  if (eventType.includes('code') || eventType.includes('python') || eventType.includes('execution')) {
    return 'function';
  }
  if (eventType.includes('message')) {
    return event.sender === 'user' ? 'user' : 'assistant';
  }
  if (eventType.includes('retrieval') || eventType.includes('retrieve')) {
    return 'retrieval';
  }
  
  return 'custom';
}

/**
 * 转换单个 AutoGen 事件为 ProtocolEvent
 */
function convertEvent(event: AutoGenEvent, nodeGraph: NodeGraph, index: number): ProtocolEvent | null {
  const timestamp = event.timestamp || Date.now();
  const eventType = event.event?.toLowerCase() || '';
  
  // 确定节点类型和状态
  const nodeType = inferNodeType(event);
  
  // 根据事件类型决定 action
  let action: ProtocolEventAction;
  let status: ProtocolNodeStatus;
  
  if (eventType.includes('start') || eventType.includes('init')) {
    action = 'start';
    status = 'running';
  } else if (eventType.includes('end') || eventType.includes('complete') || eventType.includes('done')) {
    action = 'complete';
    status = 'completed';
  } else if (event.error) {
    action = 'error';
    status = 'failed';
  } else if (eventType.includes('update') || event.is_streaming) {
    action = 'update';
    status = 'running';
  } else {
    // 默认作为新节点开始
    action = 'start';
    status = 'running';
  }
  
  // 构建节点数据
  const senderId = getOrCreateNodeId(event.sender, `agent_${index}`, nodeGraph);
  const nodeData: ProtocolNodeData = {
    nodeId: senderId,
    parentId: event.receiver ? getOrCreateNodeId(event.receiver, 'unknown', nodeGraph) : undefined,
    nodeType,
    name: event.sender || event.agent || event.function || 'Unknown',
    status,
    output: event.content || event.response || event.result,
    error: event.error,
    startTime: action === 'start' ? timestamp : undefined,
    endTime: action === 'complete' ? timestamp : undefined,
  };
  
  // LLM 相关字段
  if (event.model || event.prompt_tokens || event.completion_tokens) {
    nodeData.model = event.model;
    nodeData.tokenUsage = {
      input: event.prompt_tokens || 0,
      output: event.completion_tokens || 0,
      total: (event.prompt_tokens || 0) + (event.completion_tokens || 0),
    };
  }
  
  // 工具调用参数
  if (event.arguments) {
    nodeData.toolParams = event.arguments;
    nodeData.toolName = event.function;
  }
  
  // 构建边关系
  if (event.receiver) {
    const receiverId = getOrCreateNodeId(event.receiver, 'unknown', nodeGraph);
    nodeGraph.edges.push({ sourceId: senderId, targetId: receiverId });
  }
  
  // 更新节点图
  nodeGraph.nodes.set(senderId, nodeData);
  
  // 创建 ProtocolEvent
  const protocolEvent: ProtocolEvent = {
    id: `autogen-${index}-${eventType}`,
    type: 'node',
    action,
    timestamp,
    data: nodeData,
    metadata: {
      originalEvent: event.event,
      ...event.metadata,
    },
  };
  
  // 如果有消息内容，同时发送 message 事件
  if (event.content && (event.sender || event.agent)) {
    const messageData: ProtocolMessageData = {
      messageId: `msg-${Date.now()}-${index}`,
      role: event.sender === 'user' ? 'user' : 'assistant',
      content: event.content,
      contentType: event.content.startsWith('```') ? 'code' : 'text',
      nodeId: senderId,
      isStreaming: event.is_streaming || false,
      createdAt: timestamp,
    };
    
    protocolEvent.message = messageData;
  }
  
  return protocolEvent;
}

// ============================================
// 适配器实现
// ============================================

export const autogenAdapter: ProtocolAdapter = {
  name: 'autogen',
  version: '0.2.0',
  
  transform(nativeTrace: AutoGenTrace): ProtocolEvent[] {
    const events: ProtocolEvent[] = [];
    
    // 标准化输入 - 内联处理避免类型错误
    let eventList: AutoGenEvent[] = [];
    
    if (!nativeTrace) {
      return events;
    }
    
    // 已经是数组
    if (Array.isArray(nativeTrace)) {
      eventList = nativeTrace.flatMap(e => flattenEvents(e));
    }
    // 包装在 events 字段中
    else if ('events' in nativeTrace && Array.isArray((nativeTrace as Record<string, unknown>).events)) {
      eventList = ((nativeTrace as Record<string, unknown>).events as AutoGenEvent[]).flatMap(e => flattenEvents(e));
    }
    // 单个事件对象
    else if ('event' in nativeTrace) {
      eventList = flattenEvents(nativeTrace as AutoGenEvent);
    }
    
    if (eventList.length === 0) {
      return events;
    }
    
    // 构建节点关系图
    const nodeGraph: NodeGraph = {
      nodes: new Map(),
      edges: [],
    };
    
    // 跟踪 LLM 节点用于流式更新
    const llmNodes = new Map<string, number>();
    
    // 转换为 ProtocolEvent
    eventList.forEach((event, index) => {
      const protocolEvent = convertEvent(event, nodeGraph, index);
      
      if (protocolEvent) {
        // 处理流式 LLM 响应
        if (event.is_streaming && event.response) {
          const existingIndex = llmNodes.get(protocolEvent.data?.nodeId || '');
          
          if (existingIndex !== undefined) {
            // 更新现有 LLM 节点
            events[existingIndex] = {
              ...events[existingIndex],
              action: 'update',
              message: {
                ...events[existingIndex].message!,
                content: (events[existingIndex].message?.content || '') + event.response,
                isStreaming: true,
              },
            };
          } else {
            // 新增 LLM 节点
            llmNodes.set(protocolEvent.data?.nodeId || '', events.length);
            events.push(protocolEvent);
          }
        } else {
          events.push(protocolEvent);
        }
      }
    });
    
    // 添加会话状态事件
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      
      events.unshift({
        id: 'session-init',
        type: 'status',
        action: 'start',
        timestamp: events[0].timestamp,
        status: {
          sessionId: 'autogen-session',
          status: 'running',
          completedNodes: 0,
          totalNodes: events.filter(e => e.type === 'node').length,
        },
      });
      
      // 如果最后一个事件是 complete，添加会话结束状态
      if (lastEvent.action === 'complete') {
        events.push({
          id: 'session-end',
          type: 'status',
          action: 'complete',
          timestamp: lastEvent.timestamp,
          status: {
            sessionId: 'autogen-session',
            status: 'completed',
            completedNodes: events.filter(e => e.type === 'node' && e.action === 'complete').length,
            totalNodes: events.filter(e => e.type === 'node').length,
          },
        });
      }
    }
    
    return events;
  },
  
  extractEvents(rawData: string | object): ProtocolEvent[] {
    let parsed: unknown;
    
    try {
      if (typeof rawData === 'string') {
        // 处理可能的 SSE 格式 "data: {...}"
        const sseMatch = rawData.match(/data:\s*(\{[\s\S]*\})/);
        if (sseMatch) {
          parsed = JSON.parse(sseMatch[1]);
        } else {
          parsed = JSON.parse(rawData);
        }
      } else {
        parsed = rawData;
      }
    } catch {
      console.warn('[AutoGen Adapter] Failed to parse raw data:', rawData);
      return [];
    }
    
    // 处理可能的包装结构
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      
      // 直接是事件
      if ('event' in obj && typeof obj.event === 'string') {
        return this.transform(obj as unknown as AutoGenEvent);
      }
      
      // 包装在 data 字段
      if ('data' in obj) {
        return this.transform(obj.data as AutoGenTrace);
      }
      
      // 包装在 events 字段
      if ('events' in obj) {
        return this.transform({ events: obj.events as AutoGenEvent[] });
      }
      
      // 数组
      if (Array.isArray(obj)) {
        return this.transform(obj as AutoGenEvent[]);
      }
    }
    
    return [];
  },
};

// ============================================
// 注册适配器
// ============================================

// 导入后将在主 adapters.ts 中注册
export default autogenAdapter;