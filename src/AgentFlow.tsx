/**
 * AgentFlow - Agent SSE Stream Visualizer
 *
 * A React component for visualizing Agent execution traces.
 * Optimized for 100,000+ nodes via virtual scrolling and message batching.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import './AgentFlow.css';

import type { AgentFlowProps } from './types';
import { useSSE } from './useSSE';
import { EventRow, TimelineRow } from './EventRow';

export type { AgentFlowProps, FlowEvent } from './types';
export { EventRow } from './EventRow';

export function AgentFlow({
  url,
  theme = 'dark',
  autoConnect = true,
  onError,
  onStatusChange,
  maxEvents = 100_000,
  renderMessage,
  renderResult,
  viewMode = 'list',
  defaultCollapsed = true,
}: AgentFlowProps) {
  const {
    filteredEvents,
    status,
    stats,
    selectedAgent,
    setSelectedAgent,
    connect,
  } = useSSE({ url, autoConnect, maxEvents, onError, onStatusChange });

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [expandedArgsIds, setExpandedArgsIds] = useState<Set<number>>(new Set());
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = useCallback((id: number) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleArgs = useCallback((id: number) => {
    setExpandedArgsIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Auto-collapse new events in timeline mode
  useEffect(() => {
    if (viewMode === 'timeline' && defaultCollapsed && filteredEvents.length > 0) {
      const latest = filteredEvents[filteredEvents.length - 1];
      if (!collapsedIds.has(latest.id)) {
        setCollapsedIds(prev => new Set(prev).add(latest.id));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEvents.length]);

  // Virtual scrolling
  const virtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, []);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBottom(!isNearBottom);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`agent-flow agent-flow--${theme}${viewMode === 'timeline' ? ' agent-flow--timeline' : ''}`}>
      {/* Header */}
      <div className="agent-flow__header">
        <div className="agent-flow__header-left">
          <span className="agent-flow__status">
            <span className={`agent-flow__status-dot agent-flow__status-dot--${status}`} />
            {status}
          </span>
          <span className="agent-flow__event-count">{filteredEvents.length} events</span>
          {stats.totalCost > 0 && (
            <span className="agent-flow__cost">${stats.totalCost.toFixed(4)}</span>
          )}
          {stats.totalTokens > 0 && (
            <span className="agent-flow__tokens">{stats.totalTokens.toLocaleString()} tokens</span>
          )}
        </div>
        <div className="agent-flow__header-right">
          {stats.agents.length > 0 && (
            <select
              className="agent-flow__agent-filter"
              value={selectedAgent || ''}
              onChange={(e) => setSelectedAgent(e.target.value || null)}
            >
              <option value="">All Agents</option>
              {stats.agents.map((agent: string) => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          )}
          {status === 'disconnected' && (
            <button className="agent-flow__connect-btn" onClick={connect}>
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Events (virtualized) */}
      <div ref={parentRef} className="agent-flow__events">
        {filteredEvents.length === 0 ? (
          <div className="agent-flow__empty">No events yet. Waiting for agent...</div>
        ) : (
          <div
            className="agent-flow__events-viewport"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const event = filteredEvents[virtualRow.index];
              return (
                <div
                  key={event.id}
                  className="agent-flow__event-row"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  {viewMode === 'timeline' ? (
                    <TimelineRow
                      event={event}
                      collapsed={collapsedIds.has(event.id)}
                      onToggle={() => toggleCollapse(event.id)}
                      showArgs={expandedArgsIds.has(event.id)}
                      onToggleArgs={() => toggleArgs(event.id)}
                      renderMessage={renderMessage}
                      renderResult={renderResult}
                    />
                  ) : (
                    <EventRow
                      event={event}
                      showArgs={expandedArgsIds.has(event.id)}
                      onToggleArgs={() => toggleArgs(event.id)}
                      renderMessage={renderMessage}
                      renderResult={renderResult}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {showScrollBottom && filteredEvents.length > 0 && (
          <button className="agent-flow__scroll-bottom" onClick={scrollToBottom} title="Scroll to bottom">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default AgentFlow;
