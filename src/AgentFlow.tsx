/**
 * AgentFlow - Agent SSE Stream Visualizer
 * 
 * A simple React component for visualizing Agent execution traces.
 */

import React, { useEffect, useState, useCallback } from 'react';
import './AgentFlow.css';

export interface AgentFlowProps {
  /** SSE endpoint URL */
  url: string;
  /** Theme: 'light' | 'dark' */
  theme?: 'light' | 'dark';
  /** Auto connect on mount */
  autoConnect?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Connection status callback */
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export interface FlowEvent {
  /** Event type */
  type: 'start' | 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'end';
  /** Event message */
  message?: string;
  /** Tool name (for tool_call) */
  tool?: string;
  /** Tool arguments */
  args?: Record<string, unknown>;
  /** Tool result */
  result?: string;
  /** Timestamp */
  timestamp?: number;
}

export function AgentFlow({
  url,
  theme = 'dark',
  autoConnect = true,
  onError,
  onStatusChange,
}: AgentFlowProps) {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  const handleStatusChange = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const connect = useCallback(() => {
    handleStatusChange('connecting');

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      handleStatusChange('connected');
    };

    eventSource.onmessage = (e) => {
      try {
        const event: FlowEvent = JSON.parse(e.data);
        setEvents(prev => [...prev, {
          ...event,
          timestamp: event.timestamp || Date.now(),
        }]);
      } catch (err) {
        console.error('[AgentFlow] Failed to parse event:', err);
      }
    };

    eventSource.onerror = (err) => {
      handleStatusChange('error');
      const error = new Error('SSE connection failed');
      onError?.(error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      handleStatusChange('disconnected');
    };
  }, [url, handleStatusChange, onError]);

  useEffect(() => {
    if (autoConnect) {
      return connect();
    }
  }, [autoConnect, connect]);

  return (
    <div className={`agent-flow agent-flow--${theme}`}>
      {/* Header */}
      <div className="agent-flow__header">
        <span className="agent-flow__status">
          <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} />
          {status}
        </span>
        {status === 'disconnected' && (
          <button className="agent-flow__connect-btn" onClick={connect}>
            Connect
          </button>
        )}
      </div>

      {/* Events */}
      <div className="agent-flow__events">
        {events.map((event, index) => (
          <div key={index} className={`agent-flow__event agent-flow__event--${event.type}`}>
            <EventIcon type={event.type} />
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
          <div className="agent-flow__empty">No events yet. Waiting for agent...</div>
        )}
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: FlowEvent['type'] }) {
  const icons: Record<FlowEvent['type'], string> = {
    start: '▶️',
    thinking: '💭',
    tool_call: '🔧',
    tool_result: '✅',
    message: '💬',
    error: '❌',
    end: '🏁',
  };
  return <span className="agent-flow__event-icon">{icons[type]}</span>;
}

export default AgentFlow;
