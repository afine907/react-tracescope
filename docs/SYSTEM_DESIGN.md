# StreamTrace System Design Document

## Version: 1.0  
**Date:** 2026-04-17  
**Status:** POC Phase

---

## 1. Architecture Overview

### 1.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 18 Adapter Layer                   │
│  (useStreamTrace, StreamTraceProvider, hooks)              │
├─────────────────────────────────────────────────────────────┤
│                    Component Layer                          │
│  (TraceTree, TraceNode, StatusIndicator, etc.)             │
├─────────────────────────────────────────────────────────────┤
│                    Core Engine Layer                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   SSE Mgr    │ │ State Manager│ │ Tree Builder │        │
│  │              │ │              │ │              │        │
│  │ - Connect    │ │ - node_create│ │ - parentId   │        │
│  │ - Parse      │ │ - node_append│ │ - traversal  │        │
│  │ - Reconnect  │ │ - immutable  │ │ - lookup     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│  ┌──────────────┐                                         │
│  │  Renderer    │                                         │
│  │              │                                         │
│  │ - incremental│                                         │
│  │ - debounce   │                                         │
│  │ - diff       │                                         │
│  └──────────────┘                                         │
├─────────────────────────────────────────────────────────────┤
│                    Type Layer                               │
│  (Interfaces, Enums, Constants)                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
SSE Server
    │
    ▼
SSE Manager ──► Message Parser ──► Validator
    │                                 │
    │                          ┌──────┴──────┐
    │                          ▼             ▼
    │                    node_create    node_append
    │                          │             │
    ▼                          ▼             ▼
State Manager ◄─────────────────────────────────┘
    │
    ▼
Tree Builder ──► Tree Structure ──► React State
    │
    ▼
Renderer Engine ──► Diff Detection ──► Virtual DOM
    │
    ▼
React Components ──► DOM Update (only changed nodes)
```

---

## 2. Module Design

### 2.1 SSE Manager Module (`core/sse/`)

**Responsibilities:**
- SSE connection lifecycle management
- Message parsing and protocol validation
- Auto-reconnect with exponential backoff
- Connection state management

**Public API:**

```typescript
interface SSEManagerConfig {
  url: string;
  headers?: Record<string, string>;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  onMessage?: (message: SSEStreamMessage) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: ConnectionState) => void;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

class SSEManager {
  constructor(config: SSEManagerConfig);
  connect(): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  getState(): ConnectionState;
}
```

**Internal Logic:**
1. Initialize EventSource with URL and headers
2. Listen to `onmessage`, `onerror`, `onopen` events
3. Parse `data:` field as JSON
4. Validate message structure against protocol
5. Emit valid messages via `onMessage` callback
6. On error: trigger exponential backoff reconnect
7. Track connection state changes

### 2.2 State Manager Module (`core/state/`)

**Responsibilities:**
- Flattened Map storage for O(1) operations
- Immutable data updates
- Node lifecycle management
- Message deduplication

**Public API:**

```typescript
interface NodeMap {
  [nodeId: string]: StreamNode;
}

type NodeEventType = 'node_create' | 'node_append';

interface StateManagerOptions {
  maxNodes?: number;
  onNodeUpdate?: (nodeId: string, node: StreamNode) => void;
}

class StateManager {
  constructor(options?: StateManagerOptions);
  
  // Node operations
  createNode(node: StreamNode): void;
  appendContent(nodeId: string, chunk: string, status?: NodeStatus): void;
  getNode(nodeId: string): StreamNode | undefined;
  getAllNodes(): NodeMap;
  
  // Bulk operations
  getNodesByAgent(agentId: string): StreamNode[];
  clear(): void;
  
  // Statistics
  getNodeCount(): number;
}
```

**Internal Logic:**
1. Use `Map<string, StreamNode>` for storage
2. On `node_create`: validate, check duplicate, store in Map
3. On `node_append`: locate node, concat chunk, update status
4. Use spread operator for immutable updates
5. Track last seq number for ordering
6. Emit updates via callback for renderer

### 2.3 Tree Builder Module (`core/tree/`)

**Responsibilities:**
- Build tree structure from flat node Map
- Support infinite nesting levels
- Provide traversal and lookup methods
- Handle parent-waiting scenarios

**Public API:**

```typescript
interface TreeNode {
  nodeId: string;
  data: StreamNode;
  children: TreeNode[];
  depth: number;
}

type TraversalType = 'DFS' | 'BFS';

class TreeBuilder {
  constructor();
  
  // Building
  buildTree(nodes: NodeMap): TreeNode | null;
  addNode(node: StreamNode): void;
  updateNode(nodeId: string, data: Partial<StreamNode>): void;
  
  // Traversal
  traverse(type: TraversalType, callback: (node: TreeNode) => void): void;
  findNode(nodeId: string): TreeNode | null;
  getChildren(nodeId: string): TreeNode[];
  getDepth(nodeId: string): number;
  
  // Utility
  getRootNodes(): TreeNode[];
  clear(): void;
}
```

**Internal Logic:**
1. Build adjacency list from parentId
2. Recursively construct tree from root (parentId = null)
3. Cache tree structure for performance
4. Invalidate cache on node add/update
5. Support both DFS and BFS traversal
6. Handle orphan nodes (parent not found)

### 2.4 Renderer Module (`core/renderer/`)

**Responsibilities:**
- Detect node changes for incremental rendering
- Debounce high-frequency updates
- Calculate render diffs
- Coordinate with React adapter

**Public API:**

```typescript
interface RenderOptions {
  debounceMs?: number;
  maxNodesBeforeDegrade?: number;
}

interface RenderEvent {
  type: 'created' | 'updated' | 'deleted';
  nodeId: string;
  node?: StreamNode;
}

class Renderer {
  constructor(options?: RenderOptions);
  
  // Rendering
  scheduleRender(event: RenderEvent): void;
  flush(): void;
  
  // Configuration
  setDebounce(ms: number): void;
  getDebounce(): number;
  
  // Statistics
  getRenderCount(): number;
  getPendingCount(): number;
}
```

**Internal Logic:**
1. Receive node change events
2. Queue events with debounce timer
3. On timer fire: batch process all queued events
4. Emit diff for React adapter to apply
5. Track render statistics
6. Auto-degrade on threshold

### 2.5 React Adapter (`adapters/react/`)

**Responsibilities:**
- Bridge core modules to React ecosystem
- Provide hooks and context
- Manage React state updates
- Optimize with useMemo/useCallback

**Public API:**

```typescript
interface StreamTraceConfig {
  url: string;
  headers?: Record<string, string>;
  agentId?: string;
  theme?: ThemeConfig;
  onError?: (error: Error) => void;
}

interface StreamTraceState {
  nodes: NodeMap;
  tree: TreeNode | null;
  connectionState: ConnectionState;
  error: Error | null;
}

// Main hook
function useStreamTrace(config: StreamTraceConfig): StreamTraceState;

// Context provider
function StreamTraceProvider({ children, config }: { 
  children: React.ReactNode; 
  config: StreamTraceConfig; 
}): JSX.Element;

// Utility hooks
function useTraceNode(nodeId: string): StreamNode | undefined;
function useTraceTree(): TreeNode | null;
function useConnectionState(): ConnectionState;
```

---

## 3. Data Structures

### 3.1 Core Interfaces

```typescript
// SSE Message (from server)
interface SSEStreamMessage {
  msgId: string;
  type: 'node_create' | 'node_append';
  data: StreamNode;
  seq: number;
  timestamp: number;
  protocolVersion?: string;
}

// Node structure (core data unit)
interface StreamNode {
  nodeId: string;
  parentId?: string | null;
  nodeType?: NodeType;
  chunk: string;
  status?: NodeStatus;
  agentId?: string;
  createdAt?: number;
  updatedAt?: number;
  [key: `x-${string}`]: any;
}

// Enums
type NodeType = 
  | 'user_input' 
  | 'assistant_thought' 
  | 'tool_call' 
  | 'code_execution' 
  | 'execution_result' 
  | 'final_output';

type NodeStatus = 'streaming' | 'complete' | 'error';

type ConnectionState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'error';
```

### 3.2 Internal Data Structures

```typescript
// Flattened node storage
interface NodeMap {
  [nodeId: string]: StreamNode;
}

// Tree node for rendering
interface RenderTreeNode {
  nodeId: string;
  data: StreamNode;
  children: RenderTreeNode[];
  depth: number;
  isExpanded: boolean;
}

// Render queue item
interface RenderQueueItem {
  nodeId: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
}
```

---

## 4. Component Design

### 4.1 Component Hierarchy

```
StreamTraceProvider
    │
    └── StreamTraceView
            │
            ├── ConnectionStatus
            │
            ├── TraceTree
            │       │
            │       └── TraceNode (recursive)
            │               │
            │               ├── NodeHeader
            │               │       ├── NodeTypeBadge
            │               │       ├── StatusIndicator
            │               │       └── ExpandButton
            │               │
            │               └── NodeContent
            │                       ├── TextRenderer
            │                       ├── CodeRenderer
            │                       └── MarkdownRenderer
            │
            └── Toolbar
                    ├── ClearButton
                    ├── ReconnectButton
                    └── SettingsButton
```

### 4.2 Component Props

```typescript
// TraceNode props
interface TraceNodeProps {
  node: TreeNode;
  depth: number;
  isExpanded?: boolean;
  onToggleExpand?: (nodeId: string) => void;
  onCopy?: (nodeId: string) => void;
  customStyles?: NodeStyleConfig;
}

// Node style configuration
interface NodeStyleConfig {
  backgroundColor?: string;
  borderColor?: string;
  labelColor?: string;
  indentSize?: number;
}
```

---

## 5. Error Handling

### 5.1 Error Categories

| Category | Handling |
|----------|----------|
| Connection error | Auto-reconnect with backoff |
| Protocol invalid | Log warning, skip message |
| Node not found (append) | Log error, skip |
| Memory overflow | Clear oldest nodes |
| Render error | Catch, log, continue |

### 5.2 Reconnection Strategy

```
Initial: 1s
Retry 1: 2s  
Retry 2: 4s
Retry 3: 8s
... (max 30s)
Reset on successful connection
```

---

## 6. Performance Optimizations

### 6.1 Rendering Optimization

1. **Incremental Updates**: Only re-render changed nodes
2. **Debouncing**: Batch high-frequency updates (50ms)
3. **Memoization**: Use React.memo for node components
4. **Virtualization**: For 1000+ nodes, render visible only

### 6.2 Memory Optimization

1. **Node Limit**: Max 1000 nodes, FIFO eviction
2. **String Concatenation**: Use array join for chunks
3. **WeakMap**: For parent references

---

## 7. File Structure

```
streamtrace/
├── types/
│   ├── index.ts              # Main exports
│   ├── node.ts               # StreamNode, NodeType, NodeStatus
│   ├── message.ts            # SSEStreamMessage
│   ├── tree.ts               # TreeNode, traversal types
│   └── config.ts             # Configuration interfaces
│
├── core/
│   ├── sse/
│   │   ├── index.ts          # SSEManager class
│   │   ├── parser.ts         # Message parsing
│   │   ├── validator.ts      # Protocol validation
│   │   └── reconnect.ts      # Reconnection logic
│   │
│   ├── state/
│   │   ├── index.ts          # StateManager class
│   │   ├── node-operations.ts# CRUD operations
│   │   └── immutable.ts      # Immutable update utilities
│   │
│   ├── tree/
│   │   ├── index.ts          # TreeBuilder class
│   │   ├── builder.ts        # Tree construction
│   │   └── traversal.ts      # DFS/BFS methods
│   │
│   └── renderer/
│       ├── index.ts          # Renderer class
│       ├── diff.ts           # Change detection
│       └── scheduler.ts      # Debounce scheduling
│
├── adapters/
│   └── react/
│       ├── index.ts          # Main exports
│       ├── provider.tsx      # StreamTraceProvider
│       ├── hooks.ts          # useStreamTrace, etc.
│       └── context.ts        # React context
│
├── components/
│   ├── index.ts              # Component exports
│   ├── StreamTraceView.tsx   # Main view component
│   ├── TraceTree.tsx         # Tree container
│   ├── TraceNode.tsx         # Individual node (recursive)
│   ├── NodeHeader.tsx        # Node header with badge
│   ├── NodeContent.tsx       # Node content renderer
│   ├── StatusIndicator.tsx   # Streaming animation
│   ├── ConnectionStatus.tsx  # Connection indicator
│   └── Toolbar.tsx           # Action toolbar
│
├── styles/
│   ├── index.css             # Main styles
│   ├── node-themes.css       # Node type themes
│   └── animations.css        # Status animations
│
├── mock-server/
│   ├── index.js              # Express + SSE server
│   ├── routes/
│   │   └── stream.js         # Stream endpoint
│   └── data/
│       └── mock-trace.json   # Mock trace data
│
├── examples/
│   └── basic/
│       ├── index.html        # Standalone demo
│       ├── App.tsx           # Example app
│       └── main.tsx          # Entry point
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

- StateManager: CRUD operations, immutability
- TreeBuilder: construction, traversal
- Renderer: debounce, batch processing
- Validator: message validation

### 8.2 Integration Tests

- Full flow: SSE → Parser → State → Tree → Render
- Reconnection handling
- Error recovery

### 8.3 E2E Tests

- Mock SSE server → React app
- Performance benchmarking
- Visual regression

---

*End of System Design Document*