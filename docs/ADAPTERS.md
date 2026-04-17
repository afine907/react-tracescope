# TraceScope Adapters Guide

> Learn how to use adapters to integrate different Agent frameworks with TraceScope

---

## Overview

TraceScope uses an **Adapter Pattern** to normalize trace data from different frameworks into a unified protocol format. This allows you to switch between frameworks without changing your visualization code.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Framework │────▶│    Adapter   │────▶│   Protocol      │
│   Native    │     │              │     │   Events        │
│   Format    │     │              │     │                 │
└─────────────┘     └──────────────┘     └─────────────────┘
```

## Supported Adapters

| Adapter | Framework | Status | Version |
|---------|-----------|--------|---------|
| `custom` | Custom JSON | ✅ Stable | 1.0.0 |
| `langchain` | LangChain | ✅ Stable | 0.1.0 |
| `autogen` | AutoGen | ✅ Stable | 0.2.0 |
| `dify` | Dify | ✅ Stable | 0.1.0 |
| `coze` | Coze | 🔄 Planned | - |

## Quick Start

### 1. Configure Adapter in Provider

```tsx
import { TraceScopeProvider, TraceTree } from 'react-tracescope';
import 'react-tracescope/style.css';

function App() {
  return (
    <TraceScopeProvider
      config={{
        url: 'https://api.example.com/trace/stream',
        adapter: 'langchain',  // Specify adapter here
      }}
    >
      <TraceTree />
    </TraceScopeProvider>
  );
}
```

### 2. Or Create Adapter Programmatically

```tsx
import { createAdapter, langchainAdapter } from 'react-tracescope';

// Use built-in adapter by name
const adapter = createAdapter('langchain');

// Or use custom adapter instance
const customAdapter = createAdapter({
  name: 'my-custom-adapter',
  version: '1.0.0',
  transform: (data) => { /* ... */ },
  extractEvents: (raw) => { /* ... */ },
});
```

---

## Adapter Details

### Custom Adapter

For raw JSON data that follows the [TRACE_PROTOCOL](./TRACE_PROTOCOL.md) format.

**Input Format:**
```json
{
  "id": "node-1",
  "type": "node",
  "action": "start",
  "timestamp": 1234567890,
  "data": {
    "nodeId": "node-1",
    "nodeType": "llm",
    "name": "My LLM",
    "status": "running"
  }
}
```

**Usage:**
```tsx
<TraceScopeProvider config={{ adapter: 'custom' }}>
  <TraceTree />
</TraceScopeProvider>
```

---

### LangChain Adapter

Converts LangChain's trace format to TraceScope protocol.

**Original LangChain Format:**
```json
{
  "id": ["chain:", "RunnableSequence", "chain"],
  "name": "RunnableSequence",
  "input": "What is AI?",
  "output": "AI is...",
  "start_time": 1234567890,
  "end_time": 1234567891,
  "children": [...],
  "llm_output": {
    "token_usage": {
      "prompt_tokens": 100,
      "completion_tokens": 50,
      "total_tokens": 150
    },
    "model_name": "gpt-4"
  }
}
```

**Key Features:**
- Auto-detects node types (LLM, Tool, Retrieval, Function)
- Extracts token usage from LLM calls
- Handles nested child traces

**Usage:**
```tsx
<TraceScopeProvider config={{ adapter: 'langchain' }}>
  <TraceTree />
</TraceScopeProvider>
```

---

### AutoGen Adapter

Converts AutoGen's event format to TraceScope protocol.

**Original AutoGen Format:**
```json
{
  "event": "agent_message",
  "sender": "assistant",
  "receiver": "user",
  "content": "Hello!",
  "timestamp": 1234567890,
  "model": "gpt-4",
  "prompt_tokens": 100,
  "completion_tokens": 50,
  "is_streaming": false
}
```

**Supported Event Types:**
- `agent_message` - Agent-to-agent messages
- `function_call` / `tool_call` - Tool invocations
- `llm_response` - LLM responses
- `code_execution` - Code execution results
- `agent_start` / `agent_end` - Agent lifecycle
- `agent_thought` - Reasoning/inner thoughts

**Usage:**
```tsx
<TraceScopeProvider config={{ adapter: 'autogen' }}>
  <TraceTree />
</TraceScopeProvider>
```

---

### Dify Adapter

Converts Dify workflow execution traces to TraceScope protocol.

**Original Dify Format:**
```json
{
  "event": "node_finished",
  "node_id": "node-1",
  "node_type": "llm",
  "node_name": "AI Assistant",
  "inputs": { "query": "Hello" },
  "outputs": { "text": "Hi there!" },
  "execution_metadata": {
    "total_tokens": 150,
    "model_name": "gpt-4"
  },
  "latency": 1.5
}
```

**Supported Node Types:**
- `llm` - LLM nodes
- `agent` - Agent nodes
- `tool` - Tool nodes
- `knowledge-retrieval` - Knowledge base retrieval
- `http` - HTTP request nodes
- `conditional` - Conditional branching

**Usage:**
```tsx
<TraceScopeProvider config={{ adapter: 'dify' }}>
  <TraceTree />
</TraceScopeProvider>
```

---

## Custom Adapter

You can create your own adapter for frameworks not listed above.

### Interface

```typescript
interface ProtocolAdapter {
  /** Adapter name */
  name: string;
  
  /** Adapter version */
  version: string;
  
  /**
   * Transform native trace format to ProtocolEvent[]
   * @param nativeTrace - Raw trace data from the framework
   * @returns Array of standardized protocol events
   */
  transform(nativeTrace: unknown): ProtocolEvent[];
  
  /**
   * Extract events from raw data (e.g., SSE stream chunks)
   * @param rawData - Raw string or object from stream
   * @returns Array of standardized protocol events
   */
  extractEvents(rawData: string | object): ProtocolEvent[];
}
```

### Example: Custom Adapter

```typescript
import type { ProtocolAdapter, ProtocolEvent } from 'react-tracescope';

const myAdapter: ProtocolAdapter = {
  name: 'my-framework',
  version: '1.0.0',
  
  transform(nativeTrace: MyFrameworkTrace): ProtocolEvent[] {
    const events: ProtocolEvent[] = [];
    
    // Transform each node
    for (const node of nativeTrace.nodes) {
      events.push({
        id: `node-${node.id}`,
        type: 'node',
        action: 'start',
        timestamp: node.startTime,
        data: {
          nodeId: node.id,
          nodeType: node.type,
          name: node.name,
          status: 'running',
          input: node.input,
        },
      });
      
      if (node.completedAt) {
        events.push({
          id: `node-${node.id}-complete`,
          type: 'node',
          action: 'complete',
          timestamp: node.completedAt,
          data: {
            nodeId: node.id,
            nodeType: node.type,
            name: node.name,
            status: 'completed',
            output: node.output,
          },
        });
      }
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

// Register and use
import { registerAdapter } from 'react-tracescope';
registerAdapter(myAdapter);

<TraceScopeProvider config={{ adapter: 'my-framework' }}>
  <TraceTree />
</TraceScopeProvider>
```

---

## Protocol Event Format

All adapters output events in the standard ProtocolEvent format:

```typescript
interface ProtocolEvent {
  /** Unique event ID */
  id: string;
  
  /** Event type */
  type: 'node' | 'message' | 'status';
  
  /** Event action */
  action: 'start' | 'complete' | 'error' | 'update';
  
  /** Unix timestamp (milliseconds) */
  timestamp: number;
  
  /** Node data (for node events) */
  data?: ProtocolNodeData;
  
  /** Message data (for message events) */
  message?: ProtocolMessageData;
  
  /** Status data (for status events) */
  status?: ProtocolStatusData;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

interface ProtocolNodeData {
  nodeId: string;
  parentId?: string;
  nodeType: 'llm' | 'tool' | 'retrieval' | 'function' | 'user' | 'assistant' | 'custom';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  model?: string;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  toolName?: string;
  toolParams?: Record<string, unknown>;
}
```

For complete protocol specification, see [TRACE_PROTOCOL.md](./TRACE_PROTOCOL.md).

---

## Troubleshooting

### Adapter Not Found

```
Warning: Adapter "xyz" not found, using custom adapter
```

**Solution:** Make sure the adapter name is correct. Available adapters: `custom`, `langchain`, `autogen`, `dify`.

### Parsing Errors

If your trace data isn't being parsed correctly:

1. Check the original format matches the adapter's expected input
2. Use browser DevTools to inspect the raw data stream
3. Enable debug logging:
```tsx
<TraceScopeProvider
  config={{
    adapter: 'langchain',
    debug: true,  // Enable debug mode
  }}
>
```

### Missing Fields

If certain fields aren't showing in the visualization:

1. Verify the source framework is emitting those fields
2. Check if the adapter extracts those fields (see adapter source code)
3. Consider creating a custom adapter to extract additional fields