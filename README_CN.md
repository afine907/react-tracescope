# agent-sse-flow

> Agent SSE 流式可视化组件 - 免费、无限制、本地运行

一个轻量级 React 组件，用于可视化 Agent 执行轨迹的 SSE 流。

## 为什么选择 agent-sse-flow?

| 痛点 | 解决方案 |
|------|----------|
| LangSmith 免费版每月限制 5000 条 trace | ✅ 完全免费，无限制 |
| LangSmith 数据上传到云端 | ✅ 本地运行，数据不离开你的机器 |
| 调试工具过于复杂 | ✅ 简单组件，5 分钟集成 |

## 安装

```bash
npm install agent-sse-flow
```

## 使用

```tsx
import { AgentFlow } from 'agent-sse-flow'
import 'agent-sse-flow/style.css'

function App() {
  return (
    <AgentFlow 
      url="http://localhost:8080/agent/stream"
      theme="dark"
    />
  )
}
```

## Props

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | `string` | 必填 | SSE 端点 URL |
| `theme` | `'light' \| 'dark'` | `'dark'` | 颜色主题 |
| `autoConnect` | `boolean` | `true` | 挂载时自动连接 |
| `onError` | `(error: Error) => void` | - | 错误回调 |
| `onStatusChange` | `(status: string) => void` | - | 连接状态回调 |

## SSE 事件格式

组件期望接收以下 JSON 格式的 SSE 事件：

```json
{"type": "start", "message": "Agent started"}
{"type": "thinking", "message": "Analyzing request..."}
{"type": "tool_call", "tool": "read_file", "args": {"path": "src/index.ts"}}
{"type": "tool_result", "result": "file content..."}
{"type": "message", "message": "Here's what I found..."}
{"type": "end", "message": "Done"}
```

### 事件类型

| 类型 | 说明 | 字段 |
|------|------|------|
| `start` | Agent 启动 | `message` |
| `thinking` | Agent 思考中 | `message` |
| `tool_call` | 调用工具 | `tool`, `args` |
| `tool_result` | 工具返回结果 | `result` |
| `message` | 文本消息 | `message` |
| `error` | 发生错误 | `message` |
| `end` | Agent 结束 | `message` |

## 示例：LangGraph 集成

```python
# Python (FastAPI)
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/agent/stream")
async def agent_stream():
    async def generate():
        yield f'data: {{"type": "start", "message": "Agent started"}}\n\n'
        
        yield f'data: {{"type": "thinking", "message": "Analyzing..."}}\n\n'
        
        yield f'data: {{"type": "tool_call", "tool": "read_file", "args": {{"path": "test.py"}}}}\n\n'
        
        result = read_file("test.py")
        yield f'data: {{"type": "tool_result", "result": "{result}"}}\n\n'
        
        yield f'data: {{"type": "end", "message": "Done"}}\n\n'
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

```tsx
// React
import { AgentFlow } from 'agent-sse-flow'
import 'agent-sse-flow/style.css'

function App() {
  return (
    <div style={{ height: '100vh' }}>
      <AgentFlow 
        url="http://localhost:8000/agent/stream"
        theme="dark"
      />
    </div>
  )
}
```

## 特性

- ✅ **SSE 流式传输** - 实时事件可视化
- ✅ **深色/浅色主题** - 内置主题支持
- ✅ **连接状态** - 可视化状态指示器
- ✅ **错误处理** - 优雅的错误展示
- ✅ **TypeScript** - 完整类型支持
- ✅ **零依赖** - 仅需 React 作为 peer dependency

## 对比

| 特性 | agent-sse-flow | LangSmith |
|------|---------------|-----------|
| 价格 | 免费 | 免费版有限制 |
| Trace 限制 | 无限制 | 5000条/月 |
| 数据位置 | 本地 | 云端 |
| 接入时间 | 5 分钟 | 需要注册账号 |
| 依赖 | 仅 React | LangChain 生态 |

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm type-check
```

## License

MIT © 2024

## 链接

- [GitHub](https://github.com/afine907/react-tracescope)
- [NPM](https://www.npmjs.com/package/agent-sse-flow)
- [Issues](https://github.com/afine907/react-tracescope/issues)
