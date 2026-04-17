# TraceScope Protocol Specification

> Agent Trace 可视化数据交换协议 | 版本: 1.0.0

---

## 1. 设计原则

| 原则 | 说明 |
|------|------|
| **简约** | 最少字段够用即可 |
| **可扩展** | 支持自定义 metadata |
| **流式友好** | 每个事件独立，可增量处理 |
| **框架无关** | 不绑定任何 Agent 框架 |

---

## 2. 核心数据类型

### 2.1 TraceEvent（跟踪事件）

SSE 推送的基本单元：

```typescript
interface TraceEvent {
  /** 事件唯一ID (可重复，推送更新时用同一ID) */
  id: string;
  
  /** 事件类型 */
  type: 'node' | 'edge' | 'status' | 'message';
  
  /** 操作类型 */
  action: 'start' | 'update' | 'complete' | 'error';
  
  /** 时间戳 (毫秒) */
  timestamp: number;
  
  /** 节点/边数据 (type=node/edge 时) */
  data?: NodeData | EdgeData;
  
  /** 状态数据 (type=status 时) */
  status?: StatusData;
  
  /** 消息数据 (type=message 时) */
  message?: MessageData;
  
  /** 扩展字段 (框架自定义数据) */
  metadata?: Record<string, unknown>;
}
```

### 2.2 NodeData（节点数据）

```typescript
interface NodeData {
  /** 节点唯一ID */
  nodeId: string;
  
  /** 父节点ID (根节点为空) */
  parentId?: string;
  
  /** 节点类型 */
  nodeType: NodeType;
  
  /** 节点显示名称 */
  name: string;
  
  /** 节点状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  /** 输入数据 */
  input?: unknown;
  
  /** 输出数据 */
  output?: unknown;
  
  /** 错误信息 (status=failed 时) */
  error?: string;
  
  /** 开始时间 */
  startTime?: number;
  
  /** 结束时间 */
  endTime?: number;
  
  /** token 计数 (LLM 节点) */
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  
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

/** 节点类型枚举 */
type NodeType = 
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
```

### 2.3 EdgeData（边数据）

```typescript
interface EdgeData {
  /** 边唯一ID */
  edgeId: string;
  
  /** 源节点ID */
  sourceId: string;
  
  /** 目标节点ID */
  targetId: string;
  
  /** 边类型 */
  edgeType: 'normal' | 'condition-true' | 'condition-false' | 'loop-back' | 'error';
  
  /** 条件标签 (condition 节点用) */
  condition?: string;
  
  /** 是否为默认路径 */
  isDefault?: boolean;
}
```

### 2.4 StatusData（状态数据）

```typescript
interface StatusData {
  /** 总会话ID */
  sessionId: string;
  
  /** 会话状态 */
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
  
  /** 当前活跃节点 */
  activeNodeId?: string;
  
  /** 已完成节点数 */
  completedNodes: number;
  
  /** 总节点数 */
  totalNodes: number;
  
  /** 总 token 消耗 */
  totalTokens?: number;
  
  /** 运行耗时 (毫秒) */
  elapsedTime?: number;
  
  /** 预估剩余时间 (毫秒) */
  estimatedRemaining?: number;
}
```

### 2.5 MessageData（消息数据）

对话模式使用：

```typescript
interface MessageData {
  /** 消息ID */
  messageId: string;
  
  /** 角色 */
  role: 'user' | 'assistant' | 'system' | 'tool';
  
  /** 消息内容 */
  content: string;
  
  /** 内容类型 */
  contentType: 'text' | 'markdown' | 'code' | 'image' | 'json' | 'tool_call';
  
  /** 关联的节点ID */
  nodeId?: string;
  
  /** 是否为流式输出 (正在输入中) */
  isStreaming?: boolean;
  
  /** 当前已输出的 token 数 */
  tokensReceived?: number;
  
  /** 附件列表 */
  attachments?: Array<{
    type: 'image' | 'file' | 'audio';
    url: string;
    name?: string;
  }>;
  
  /** 时间戳 */
  createdAt: number;
}
```

---

## 3. SSE 传输格式

### 3.1 事件流格式

每个事件以 `data: ` 开头，多行 JSON 合并为单条：

```
data: {"id":"evt-001","type":"node","action":"start","timestamp":1713345678000,"data":{...}}
data: {"id":"evt-002","type":"edge","action":"start","timestamp":1713345678001,"data":{...}}
```

### 3.2 完整 SSE 响应示例

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"id":"session-start","type":"status","action":"start","timestamp":1713345678000,"status":{"sessionId":"sess-abc123","status":"running","totalNodes":0,"completedNodes":0}}

data: {"id":"node-1","type":"node","action":"start","timestamp":1713345678001,"data":{"nodeId":"node-1","nodeType":"user","name":"用户输入","status":"completed","input":"帮我写一首关于春天的诗"}}

data: {"id":"node-2","type":"node","action":"start","timestamp":1713345678002,"data":{"nodeId":"node-2","parentId":"node-1","nodeType":"llm","name":"LLM生成","status":"running","model":"gpt-4"}}

data: {"id":"node-2-stream","type":"message","action":"update","timestamp":1713345678500,"message":{"messageId":"msg-1","role":"assistant","content":"春","isStreaming":true}}

data: {"id":"node-2-stream","type":"message","action":"update","timestamp":1713345678600,"message":{"messageId":"msg-1","role":"assistant","content":"春天的","isStreaming":true}}

data: {"id":"node-2-complete","type":"node","action":"complete","timestamp":1713345679000,"data":{"nodeId":"node-2","status":"completed","output":"春风拂面，万物苏醒..."}}

data: {"id":"edge-1","type":"edge","action":"start","timestamp":1713345679001,"data":{"edgeId":"edge-1","sourceId":"node-1","targetId":"node-2","edgeType":"normal"}}

data: {"id":"session-end","type":"status","action":"complete","timestamp":1713345679002,"status":{"sessionId":"sess-abc123","status":"completed","completedNodes":2,"totalNodes":2,"totalTokens":150}}
```

---

## 4. 框架适配层 (Adapter)

### 4.1 Adapter 接口

```typescript
interface TraceAdapter {
  /** 适配器名称 */
  name: string;
  
  /** 支持的框架版本 */
  version: string;
  
  /**
   * 将框架的原生 trace 格式转换为 TraceEvent[]
   * @param nativeTrace 框架原生的 trace 数据
   * @returns 标准化的 TraceEvent 数组
   */
  transform(nativeTrace: unknown): TraceEvent[];
  
  /**
   * 从原始 SSE 数据提取事件 (有些框架会包装一层)
   * @param rawData 原始 SSE data
   * @returns 解析后的事件数组
   */
  extractEvents(rawData: string | object): TraceEvent[];
}

/** 适配器注册表 */
const adapters: Map<string, TraceAdapter> = new Map();

function registerAdapter(adapter: TraceAdapter) {
  adapters.set(adapter.name, adapter);
}

function getAdapter(name: string): TraceAdapter | undefined {
  return adapters.get(name);
}
```

### 4.2 内置适配器 (规划)

| 适配器 | 状态 | 说明 |
|--------|------|------|
| `langchain` | 📋 待开发 | LangChain trace 格式 |
| `autogen` | 📋 待开发 | AutoGen 代理 trace |
| `dify` | 📋 待开发 | Dify 工作流 trace |
| `coze` | 📋 待开发 | Coze Bot trace |
| `openai-assistant` | 📋 待开发 | OpenAI Assistant API |
| `custom` | ✅ 已支持 | 自定义 JSON |

---

## 5. 前端使用方式

### 5.1 基础接入

```tsx
import { TraceScopeProvider, useTraceTree } from 'react-tracescope';

function App() {
  return (
    <TraceScopeProvider
      config={{
        // 标准 SSE 端点
        url: 'https://api.example.com/trace/stream',
        // 或指定适配器
        adapter: 'langchain',
        autoConnect: true,
      }}
    >
      <TraceViewer />
    </TraceScopeProvider>
  );
}
```

### 5.2 自定义适配器接入

```tsx
import { TraceScopeProvider, useTraceEvents } from 'react-tracescope';

// 自定义适配器
const myAdapter = {
  name: 'my-framework',
  version: '1.0.0',
  transform(nativeTrace) {
    // 将框架数据转为标准事件
    return nativeTrace.events.map(e => ({
      id: e.event_id,
      type: 'node',
      action: e.status,
      timestamp: e.time,
      data: { ... }
    }));
  },
  extractEvents(raw) {
    return JSON.parse(raw);
  }
};

function App() {
  return (
    <TraceScopeProvider
      config={{
        url: '/api/trace',
        adapter: myAdapter,  // 传入自定义适配器
      }}
    >
      <TraceViewer />
    </TraceScopeProvider>
  );
}
```

---

## 6. 性能目标

| 指标 | 目标值 |
|------|--------|
| 首屏渲染 | < 100ms |
| 节点插入延迟 | < 16ms (60fps) |
| 最大节点数 | 100,000+ |
| 内存占用 | < 100MB (10万节点) |
| SSE 重连 | < 500ms |

---

## 7. 错误处理

### 7.1 错误事件

```typescript
interface ErrorData {
  /** 错误码 */
  code: 'CONNECTION_ERROR' | 'PARSE_ERROR' | 'TIMEOUT' | 'SERVER_ERROR';
  
  /** 错误描述 */
  message: string;
  
  /** 关联的节点ID (可选) */
  nodeId?: string;
  
  /** 重试建议 */
  suggestion?: string;
}
```

### 7.2 自动重连策略

- 首次失败：1s 后重试
- 第2次失败：2s 后重试
- 第3次失败：4s 后重试
- 最多重试 5 次
- 每次重试指数退避

---

## 8. 附录

### 8.1 完整 TypeScript 类型定义

```typescript
// 文件: packages/protocol/src/types.ts

// === 核心类型 ===

export type EventType = 'node' | 'edge' | 'status' | 'message';
export type EventAction = 'start' | 'update' | 'complete' | 'error';

export type NodeType = 
  | 'llm' 
  | 'tool' 
  | 'condition' 
  | 'loop' 
  | 'user' 
  | 'assistant' 
  | 'system' 
  | 'function'
  | 'retrieval'
  | 'custom';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type EdgeType = 'normal' | 'condition-true' | 'condition-false' | 'loop-back' | 'error';

export type SessionStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'failed';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ContentType = 'text' | 'markdown' | 'code' | 'image' | 'json' | 'tool_call';

// === 接口定义 ===

export interface TraceEvent {
  id: string;
  type: EventType;
  action: EventAction;
  timestamp: number;
  data?: NodeData | EdgeData;
  status?: StatusData;
  message?: MessageData;
  metadata?: Record<string, unknown>;
}

export interface NodeData {
  nodeId: string;
  parentId?: string;
  nodeType: NodeType;
  name: string;
  status: NodeStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  model?: string;
  toolName?: string;
  toolParams?: Record<string, unknown>;
  tags?: string[];
  order?: number;
}

export interface EdgeData {
  edgeId: string;
  sourceId: string;
  targetId: string;
  edgeType: EdgeType;
  condition?: string;
  isDefault?: boolean;
}

export interface StatusData {
  sessionId: string;
  status: SessionStatus;
  activeNodeId?: string;
  completedNodes: number;
  totalNodes: number;
  totalTokens?: number;
  elapsedTime?: number;
  estimatedRemaining?: number;
}

export interface MessageData {
  messageId: string;
  role: MessageRole;
  content: string;
  contentType: ContentType;
  nodeId?: string;
  isStreaming?: boolean;
  tokensReceived?: number;
  attachments?: Array<{
    type: 'image' | 'file' | 'audio';
    url: string;
    name?: string;
  }>;
  createdAt: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

// === 适配器接口 ===

export interface TraceAdapter {
  name: string;
  version: string;
  transform(nativeTrace: unknown): TraceEvent[];
  extractEvents(rawData: string | object): TraceEvent[];
}

// === 配置类型 ===

export interface TraceConfig {
  url: string;
  adapter?: string | TraceAdapter;
  autoConnect?: boolean;
  debounceMs?: number;
  maxNodesBeforeDegrade?: number;
  reconnect?: {
    maxRetries: number;
    baseDelayMs: number;
  };
}
```

### 8.2 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2024-04-17 | 初始版本 |

---

## 9. 许可证

MIT License