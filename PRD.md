# StreamTrace - Agent Flow Execution Trace Visualization System

## Project Overview

**Project Name:** StreamTrace  
**Type:** Front-end Library / Visualization Framework  
**Core Feature:** SSE-based streaming trace visualization for AI Agents, mirroring Claude Code's tree visualization  
**Target Users:** Frontend developers integrating agent tracing capabilities  

---

## 1. Business Requirements

### 1.1 Core Features

1. **SSE Stream Management**
   - Connect to SSE endpoint with configurable URL
   - Support custom headers (auth tokens, tenant IDs)
   - Connection state management (connecting/connected/disconnected/error)
   - Auto-reconnect with exponential backoff (1s/2s/4s/8s, max 30s)
   - Message deduplication by msgId
   - Message ordering by seq number

2. **Node State Management**
   - Flattened Map structure for O(1) node lookup
   - Two core events: node_create, node_append
   - Immutable data update pattern
   - Node lifecycle: streaming → complete/error

3. **Tree Structure Construction**
   - Auto-build tree by parentId (root = null)
   - Support infinite nesting levels
   - Support DFS/BFS traversal
   - Parent-waiting: child nodes wait if parent not ready

4. **Streaming Incremental Rendering**
   - Only re-render changed nodes
   - Character-by-character streaming output
   - Debounced batch rendering (50ms default, configurable)
   - Recursive tree rendering with indentation

5. **Visual Interaction**
   - 6 node types with differentiated styles
   - Real-time status display (streaming animation)
   - Hierarchical indentation (32px/level)

### 1.2 Node Types

| Type | Background | Border | Label |
|------|------------|--------|-------|
| user_input | Light gray | Gray | "User Input" |
| assistant_thought | White | Purple | "Assistant Thought" |
| tool_call | Light blue | Blue | "Tool Call" |
| code_execution | Light purple | Purple | "Code Generation" |
| execution_result | Light green | Green | "Execution Result" |
| final_output | White | Dark purple | "Final Output" |
| error | Light red | Red | "Error" |

---

## 2. Functional Requirements

### 2.1 SSE Connection Module

- Configurable endpoint URL
- Custom request headers support
- Connection state management
- Manual disconnect/reconnect/reset
- Offline detection and auto-reconnect

### 2.2 Message Processing

- Parse and validate SSE messages
- Deduplicate by msgId
- Prevent out-of-order by seq
- Handle fragmented large content
- Protocol version compatibility

### 2.3 State Management

- Flattened Map: nodeId → StreamNode
- node_create: create new node in Map
- node_append: append content to existing node
- Immutable updates
- Metadata support (createdAt, updatedAt, nodeType, agentId)

### 2.4 Tree Construction

- parentId based tree building
- Real-time incremental updates
- DFS/BFS traversal methods
- Node lookup, children retrieval, level calculation

### 2.5 Rendering Engine

- Incremental rendering (only changed nodes)
- Character-by-character streaming
- Batch rendering debounce
- Recursive tree rendering
- Performance degradation for 1000+ nodes

---

## 3. Non-Functional Requirements

### 3.1 Performance

- Single message render ≤10ms
- 60fps at 10 messages/second
- Memory ≤200MB for 1000 nodes
- Bundle size ≤50KB (gzip)
- Support 10+ parallel agents

### 3.2 Compatibility

- Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- React 18+
- Mobile responsive

### 3.3 Reliability

- 99.9% availability target
- Graceful degradation on errors
- No data loss on reconnection

---

## 4. Data Protocol

### 4.1 SSE Message Format

```
data: {"msgId":"uuid","type":"node_create","data":{...},"seq":1,"timestamp":1234567890}\n\n
```

### 4.2 Message Types

```typescript
interface SSEStreamMessage {
  msgId: string;
  type: 'node_create' | 'node_append';
  data: StreamNode;
  seq: number;
  timestamp: number;
  protocolVersion?: string;
}
```

### 4.3 Node Structure

```typescript
interface StreamNode {
  nodeId: string;
  parentId?: string | null;
  nodeType?: 'user_input' | 'assistant_thought' | 'tool_call' | 'code_execution' | 'execution_result' | 'final_output';
  chunk: string;
  status?: 'streaming' | 'complete' | 'error';
  agentId?: string;
  [key: `x-${string}`]: any;
}
```

---

## 5. Project Structure

```
streamtrace/
├── types/                 # TypeScript type definitions
├── core/                  # Core logic modules
│   ├── sse/              # SSE connection management
│   ├── state/            # Node state management
│   ├── tree/             # Tree structure construction
│   └── renderer/         # Streaming rendering engine
├── adapters/
│   └── react/            # React 18 adapter
├── components/           # React components
├── mock-server/          # Mock SSE server for testing
├── examples/             # Example applications
├── package.json
├── tsconfig.json
└── README.md
```

---

## 6. Acceptance Criteria (POC Phase)

- [ ] Protocol compliance: accepts valid SSE data, filters invalid
- [ ] Full链路: Mock SSE → Parse → State → Tree → Render
- [ ] Streaming: character-by-character, incremental only
- [ ] Tree: infinite levels, parent-child correct, indentation
- [ ] Styles: 6 node types, Claude Code visual alignment
- [ ] Status: streaming/complete/error real-time sync
- [ ] Error handling: auto-reconnect, data preserved

---

## 7. Milestones

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| POC | 2 weeks | PRD, Protocol, Mock Server, React POC |
| MVP | 4 weeks | Core lib, Vue3 adapter, Complete docs |
| Release | 4 weeks | Plugin system, Advanced features, Themes |
| Open Source | 2 weeks | GitHub repo, npm publish, Community |