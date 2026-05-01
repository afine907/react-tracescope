import React from 'react'
import ReactDOM from 'react-dom/client'
import './AgentFlow.css'

// Mock SSE 数据
const mockEvents = [
  { type: 'start', message: 'Agent started' },
  { type: 'thinking', message: 'Analyzing your request...' },
  { type: 'tool_call', tool: 'read_file', args: { path: 'src/index.ts' } },
  { type: 'tool_result', result: '// File content here...' },
  { type: 'message', message: 'I found the issue in your code.' },
  { type: 'tool_call', tool: 'write_file', args: { path: 'src/fix.ts', content: '// Fixed code' } },
  { type: 'tool_result', result: 'File written successfully' },
  { type: 'end', message: 'Task completed!' },
]

// 简单的 Demo 组件
function Demo() {
  const [events, setEvents] = React.useState<typeof mockEvents>([])
  const [status, setStatus] = React.useState<'disconnected' | 'connected'>('disconnected')

  const simulateSSE = () => {
    setEvents([])
    setStatus('connected')
    
    let index = 0
    const interval = setInterval(() => {
      if (index < mockEvents.length) {
        setEvents(prev => [...prev, mockEvents[index]])
        index++
      } else {
        clearInterval(interval)
        setStatus('disconnected')
      }
    }, 1000)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', background: '#1a1a2e', borderBottom: '1px solid #2d2d44' }}>
        <h1 style={{ color: '#eaeaea', fontSize: '24px', marginBottom: '8px' }}>
          agent-sse-flow Demo
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          Agent SSE Stream Visualizer - Free, unlimited, local
        </p>
      </div>
      
      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '16px' }}>
        {/* 左侧：控制面板 */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button
            onClick={simulateSSE}
            style={{
              padding: '12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Simulate Agent Run
          </button>
          
          <div style={{ padding: '16px', background: '#242442', borderRadius: '8px', color: '#eaeaea' }}>
            <h3 style={{ marginBottom: '8px' }}>Features</h3>
            <ul style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
              <li>SSE stream visualization</li>
              <li>Dark/Light theme</li>
              <li>Connection status</li>
              <li>Tool call display</li>
              <li>Zero dependencies</li>
            </ul>
          </div>

          <div style={{ padding: '16px', background: '#242442', borderRadius: '8px', color: '#eaeaea' }}>
            <h3 style={{ marginBottom: '8px' }}>Usage</h3>
            <pre style={{ fontSize: '12px', overflow: 'auto', background: '#1a1a2e', padding: '12px', borderRadius: '4px' }}>
{`import { AgentFlow } from 'agent-sse-flow'

<AgentFlow 
  url="http://localhost:8080/sse"
  theme="dark"
/>`}
            </pre>
          </div>
        </div>

        {/* 右侧：组件预览 */}
        <div style={{ flex: 1, border: '1px solid #2d2d44', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 模拟 AgentFlow 组件 */}
            <div className="agent-flow agent-flow--dark" style={{ height: '100%' }}>
              <div className="agent-flow__header">
                <span className="agent-flow__status">
                  <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} />
                  {status}
                </span>
              </div>
              <div className="agent-flow__events">
                {events.map((event, index) => (
                  <div key={index} className={`agent-flow__event agent-flow__event--${event.type}`}>
                    <span className="agent-flow__event-icon">
                      {event.type === 'start' && '▶️'}
                      {event.type === 'thinking' && '💭'}
                      {event.type === 'tool_call' && '🔧'}
                      {event.type === 'tool_result' && '✅'}
                      {event.type === 'message' && '💬'}
                      {event.type === 'end' && '🏁'}
                    </span>
                    <div className="agent-flow__event-content">
                      <span className="agent-flow__event-type">{event.type}</span>
                      {event.message && <p className="agent-flow__event-message">{event.message}</p>}
                      {event.tool && (
                        <div className="agent-flow__event-tool">
                          <span className="agent-flow__tool-name">{event.tool}</span>
                          {event.args && (
                            <pre className="agent-flow__tool-args">{JSON.stringify(event.args, null, 2)}</pre>
                          )}
                        </div>
                      )}
                      {event.result && <pre className="agent-flow__event-result">{event.result}</pre>}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="agent-flow__empty">Click "Simulate Agent Run" to see the demo</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>
)
