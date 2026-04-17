/**
 * TraceScope Protocol Types
 * 标准化的 Agent Trace 数据交换格式
 * 
 * 定义了前后端约定的数据结构
 * 用于 SSE 流式传输的场景
 */

// ============================================
// 核心枚举类型 (Protocol 专属，避免与旧类型冲突)
// ============================================

/** 事件类型 */
export type ProtocolEventType = 'node' | 'edge' | 'status' | 'message';

/** 操作类型 */
export type ProtocolEventAction = 'start' | 'update' | 'complete' | 'error';

/** 节点类型 (Protocol 标准) */
export type ProtocolNodeType = 
  | 'llm'           // LLM 调用
  | 'tool'          // 工具调用
  | 'condition'     // 条件分支
  | 'loop'          // 循环
  | 'user'          // 用户输入
  | 'assistant'     // AI 输出
  | 'system'        // 系统消息
  | 'function'      // 函数调用
  | 'retrieval'     // 知识检索
  | 'custom';       // 自定义节点

/** 节点状态 (Protocol 标准) */
export type ProtocolNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** 边类型 */
export type ProtocolEdgeType = 'normal' | 'condition-true' | 'condition-false' | 'loop-back' | 'error';

/** 会话状态 */
export type ProtocolSessionStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'failed';

/** 消息角色 */
export type ProtocolMessageRole = 'user' | 'assistant' | 'system' | 'tool';

/** 内容类型 */
export type ProtocolContentType = 'text' | 'markdown' | 'code' | 'image' | 'json' | 'tool_call';

// ============================================
// 向后兼容别名 (已废弃，请使用 ProtocolXxx 类型)
// ============================================

/** @deprecated 请使用 ProtocolNodeType */
export type NodeType = ProtocolNodeType;

/** @deprecated 请使用 ProtocolNodeStatus */
export type NodeStatus = ProtocolNodeStatus;

/** @deprecated 请使用 ProtocolEventType */
export type EventType = ProtocolEventType;

/** @deprecated 请使用 ProtocolEventAction */
export type EventAction = ProtocolEventAction;

// ============================================
// 核心数据结构
// ============================================

/**
 * TraceEvent - SSE 推送的基本单元
 * 
 * 这是前后端约定的标准格式
 * 每个事件都是独立的，可增量处理
 */
export interface ProtocolEvent {
  /** 事件唯一ID (可重复，推送更新时用同一ID) */
  id: string;
  
  /** 事件类型 */
  type: ProtocolEventType;
  
  /** 操作类型 */
  action: ProtocolEventAction;
  
  /** 时间戳 (毫秒) */
  timestamp: number;
  
  /** 节点数据 (type=node 时) */
  data?: ProtocolNodeData;
  
  /** 边数据 (type=edge 时) */
  edge?: ProtocolEdgeData;
  
  /** 状态数据 (type=status 时) */
  status?: ProtocolStatusData;
  
  /** 消息数据 (type=message 时) */
  message?: ProtocolMessageData;
  
  /** 扩展字段 (框架自定义数据) */
  metadata?: Record<string, unknown>;
}

/**
 * NodeData - 节点数据
 */
export interface ProtocolNodeData {
  /** 节点唯一ID */
  nodeId: string;
  
  /** 父节点ID (根节点为空) */
  parentId?: string;
  
  /** 节点类型 */
  nodeType: ProtocolNodeType;
  
  /** 节点显示名称 */
  name: string;
  
  /** 节点状态 */
  status: ProtocolNodeStatus;
  
  /** 输入数据 */
  input?: unknown;
  
  /** 输出数据 */
  output?: unknown;
  
  /** 错误信息 (status=failed 时) */
  error?: string;
  
  /** 开始时间 (毫秒时间戳) */
  startTime?: number;
  
  /** 结束时间 (毫秒时间戳) */
  endTime?: number;
  
  /** Token 计数 (LLM 节点) */
  tokenUsage?: ProtocolTokenUsage;
  
  /** 模型信息 (LLM 节点) */
  model?: string;
  
  /** 工具名称 (tool 节点) */
  toolName?: string;
  
  /** 工具参数 (tool 节点) */
  toolParams?: Record<string, unknown>;
  
  /** 自定义样式标记 */
  tags?: string[];
  
  /** 排序权重 (影响同一层级展示顺序) */
  order?: number;
}

/**
 * EdgeData - 边数据
 */
export interface ProtocolEdgeData {
  /** 边唯一ID */
  edgeId: string;
  
  /** 源节点ID */
  sourceId: string;
  
  /** 目标节点ID */
  targetId: string;
  
  /** 边类型 */
  edgeType: ProtocolEdgeType;
  
  /** 条件标签 (condition 节点用) */
  condition?: string;
  
  /** 是否为默认路径 */
  isDefault?: boolean;
}

/**
 * StatusData - 状态数据
 */
export interface ProtocolStatusData {
  /** 总会话ID */
  sessionId: string;
  
  /** 会话状态 */
  status: ProtocolSessionStatus;
  
  /** 当前活跃节点 */
  activeNodeId?: string;
  
  /** 已完成节点数 */
  completedNodes: number;
  
  /** 总节点数 */
  totalNodes: number;
  
  /** 总 Token 消耗 */
  totalTokens?: number;
  
  /** 运行耗时 (毫秒) */
  elapsedTime?: number;
  
  /** 预估剩余时间 (毫秒) */
  estimatedRemaining?: number;
}

/**
 * MessageData - 消息数据 (对话模式)
 */
export interface ProtocolMessageData {
  /** 消息ID */
  messageId: string;
  
  /** 角色 */
  role: ProtocolMessageRole;
  
  /** 消息内容 */
  content: string;
  
  /** 内容类型 */
  contentType: ProtocolContentType;
  
  /** 关联的节点ID */
  nodeId?: string;
  
  /** 是否为流式输出 (正在输入中) */
  isStreaming?: boolean;
  
  /** 当前已输出的 token 数 */
  tokensReceived?: number;
  
  /** 附件列表 */
  attachments?: ProtocolAttachment[];
  
  /** 时间戳 */
  createdAt: number;
}

/**
 * TokenUsage - Token 使用统计
 */
export interface ProtocolTokenUsage {
  /** 输入 Token 数 */
  input: number;
  
  /** 输出 Token 数 */
  output: number;
  
  /** 总 Token 数 */
  total: number;
}

/**
 * Attachment - 附件
 */
export interface ProtocolAttachment {
  /** 附件类型 */
  type: 'image' | 'file' | 'audio';
  
  /** 附件 URL */
  url: string;
  
  /** 文件名 */
  name?: string;
}

// ============================================
// 适配器接口
// ============================================

/**
 * ProtocolAdapter - 框架适配器接口
 * 
 * 每个 Agent 框架有自己的 trace 格式
 * 适配器负责转换为标准 ProtocolEvent[]
 */
export interface ProtocolAdapter {
  /** 适配器名称 */
  name: string;
  
  /** 支持的框架版本 */
  version: string;
  
  /**
   * 将框架的原生 trace 格式转换为 ProtocolEvent[]
   * @param nativeTrace 框架原生的 trace 数据
   * @returns 标准化的 ProtocolEvent 数组
   */
  transform(nativeTrace: unknown): ProtocolEvent[];
  
  /**
   * 从原始 SSE 数据提取事件
   * @param rawData 原始 SSE data
   * @returns 解析后的事件数组
   */
  extractEvents(rawData: string | object): ProtocolEvent[];
}

/**
 * 内置适配器列表
 */
export type BuiltInAdapterName = 
  | 'langchain'
  | 'autogen'
  | 'dify'
  | 'coze'
  | 'openai-assistant'
  | 'custom';

// ============================================
// 配置类型
// ============================================

/**
 * TraceConfig - 组件配置
 */
export interface TraceConfig {
  /** SSE 端点 URL */
  url: string;
  
  /** 适配器名称或自定义适配器 */
  adapter?: string | TraceAdapter;
  
  /** 是否自动连接 (默认: true) */
  autoConnect?: boolean;
  
  /** 防抖时间 (毫秒, 默认: 50) */
  debounceMs?: number;
  
  /** 降级阈值 (超过此数量启用性能模式) */
  maxNodesBeforeDegrade?: number;
  
  /** 重连配置 */
  reconnect?: ReconnectConfig;
  
  /** 自定义样式 */
  theme?: ThemeConfig;
}

/**
 * ReconnectConfig - 重连配置
 */
export interface ReconnectConfig {
  /** 最大重试次数 (默认: 5) */
  maxRetries?: number;
  
  /** 基础延迟 (毫秒, 默认: 1000) */
  baseDelayMs?: number;
  
  /** 最大延迟 (毫秒, 默认: 30000) */
  maxDelayMs?: number;
}

/**
 * ThemeConfig - 主题配置
 */
export interface ThemeConfig {
  /** 暗色模式 */
  darkMode?: boolean;
  
  /** 自定义颜色 */
  colors?: Partial<Record<NodeType, string>>;
  
  /** 字体大小 */
  fontSize?: number;
}

// ============================================
// 错误类型
// ============================================

/**
 * 错误码
 */
export type ErrorCode = 
  | 'CONNECTION_ERROR' 
  | 'PARSE_ERROR' 
  | 'TIMEOUT' 
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR';

/**
 * ErrorData - 错误数据
 */
export interface ErrorData {
  /** 错误码 */
  code: ErrorCode;
  
  /** 错误描述 */
  message: string;
  
  /** 关联的节点ID (可选) */
  nodeId?: string;
  
  /** 重试建议 */
  suggestion?: string;
  
  /** 原始错误 */
  originalError?: unknown;
}

// ============================================
// 工具函数
// ============================================

/**
 * 创建节点事件的工厂函数
 */
export function createNodeEvent(
  id: string,
  action: ProtocolEventAction,
  data: ProtocolNodeData,
  metadata?: Record<string, unknown>
): ProtocolEvent {
  return {
    id,
    type: 'node',
    action,
    timestamp: Date.now(),
    data,
    metadata,
  };
}

export function createStatusEvent(
  sessionId: string,
  status: ProtocolSessionStatus,
  stats: Partial<ProtocolStatusData>
): ProtocolEvent {
  return {
    id: `status-${sessionId}`,
    type: 'status',
    action: status === 'running' ? 'start' : 'complete',
    timestamp: Date.now(),
    status: {
      sessionId,
      status,
      completedNodes: stats.completedNodes ?? 0,
      totalNodes: stats.totalNodes ?? 0,
      ...stats,
    },
  };
}

export function createMessageEvent(
  message: ProtocolMessageData,
  action: ProtocolEventAction = 'update'
): ProtocolEvent {
  return {
    id: `msg-${message.messageId}`,
    type: 'message',
    action,
    timestamp: message.createdAt,
    message,
  };
}

/**
 * 验证 ProtocolEvent 格式
 */
export function validateEvent(event: unknown): event is ProtocolEvent {
  if (!event || typeof event !== 'object') return false;
  
  const e = event as Record<string, unknown>;
  
  return (
    typeof e.id === 'string' &&
    ['node', 'edge', 'status', 'message'].includes(e.type as string) &&
    ['start', 'update', 'complete', 'error'].includes(e.action as string) &&
    typeof e.timestamp === 'number'
  );
}

// ============================================
// 兼容旧的类型名称 (向后兼容)
// ============================================

/** @deprecated 使用 ProtocolNodeType 代替 */
export type NodeTypeEnum = ProtocolNodeType;

/** @deprecated 使用 ProtocolNodeStatus 代替 */
export type NodeStatusEnum = ProtocolNodeStatus;

/** @deprecated 使用 ProtocolEventType 代替 */
export type EventTypeEnum = ProtocolEventType;

/** @deprecated 使用 ProtocolEventAction 代替 */
export type EventActionEnum = ProtocolEventAction;

/** 兼容旧名称 */
export type TraceEvent = ProtocolEvent;
export type NodeData = ProtocolNodeData;
export type EdgeData = ProtocolEdgeData;
export type StatusData = ProtocolStatusData;
export type MessageData = ProtocolMessageData;
export type TokenUsage = ProtocolTokenUsage;
export type Attachment = ProtocolAttachment;
export type TraceAdapter = ProtocolAdapter;
export type SessionStatus = ProtocolSessionStatus;
export type MessageRole = ProtocolMessageRole;
export type ContentType = ProtocolContentType;
export type EdgeType = ProtocolEdgeType;