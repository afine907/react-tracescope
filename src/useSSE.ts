import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { FlowEvent } from './types';

export interface SSEStats {
  totalCost: number;
  totalTokens: number;
  agents: string[];
}

export interface UseSSEOptions {
  url: string;
  autoConnect: boolean;
  maxEvents: number;
  onError?: (error: Error) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useSSE({ url, autoConnect, maxEvents, onError, onStatusChange }: UseSSEOptions) {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Incremental stats — avoids O(n) scans on every render
  const statsRef = useRef({
    totalCost: 0,
    totalTokens: 0,
    agentCounts: new Map<string, number>(),
  });
  const [stats, setStats] = useState<SSEStats>({ totalCost: 0, totalTokens: 0, agents: [] });

  // Filter events by selected agent (memoized)
  const filteredEvents = useMemo(
    () => selectedAgent ? events.filter(e => e.agentName === selectedAgent) : events,
    [events, selectedAgent],
  );

  // Refs for cleanup and state tracking
  const pendingRef = useRef<FlowEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      pendingRef.current = [];
    };
  }, []);

  const handleStatusChange = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Batching: buffer SSE messages and flush once per animation frame
  const flushPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending.length === 0) return;
    pendingRef.current = [];

    if (!isMountedRef.current) return;

    const s = statsRef.current;
    for (const e of pending) {
      s.totalCost += e.cost || 0;
      s.totalTokens += e.tokens || 0;
      if (e.agentName) {
        s.agentCounts.set(e.agentName, (s.agentCounts.get(e.agentName) || 0) + 1);
      }
    }

    setEvents(prev => {
      const next = [...prev, ...pending];
      if (next.length > maxEvents) {
        const removed = next.slice(0, next.length - maxEvents);
        for (const e of removed) {
          s.totalCost -= e.cost || 0;
          s.totalTokens -= e.tokens || 0;
          if (e.agentName) {
            const count = (s.agentCounts.get(e.agentName) || 0) - 1;
            if (count <= 0) {
              s.agentCounts.delete(e.agentName);
            } else {
              s.agentCounts.set(e.agentName, count);
            }
          }
        }
        return next.slice(next.length - maxEvents);
      }
      return next;
    });

    setStats({
      totalCost: s.totalCost,
      totalTokens: s.totalTokens,
      agents: Array.from(s.agentCounts.keys()),
    });
  }, [maxEvents]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    handleStatusChange('connecting');

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (isMountedRef.current) {
        handleStatusChange('connected');
      }
    };

    eventSource.onmessage = (e) => {
      if (!isMountedRef.current) return;

      try {
        const raw = JSON.parse(e.data);
        let argsJson: string | undefined;
        if (raw.args) {
          try {
            argsJson = JSON.stringify(raw.args, null, 2);
          } catch (err) {
            console.error('[AgentFlow] Failed to serialize args:', err);
            argsJson = '[Unable to serialize]';
          }
        }
        const event: FlowEvent = {
          ...raw,
          id: idCounterRef.current++,
          timestamp: raw.timestamp || Date.now(),
          argsJson,
        };
        pendingRef.current.push(event);

        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            flushPending();
          });
        }
      } catch (err) {
        console.error('[AgentFlow] Failed to parse event:', err);
        if (isMountedRef.current) {
          onError?.(new Error(`Failed to parse SSE event: ${err}`));
        }
      }
    };

    eventSource.onerror = () => {
      if (!isMountedRef.current) return;

      handleStatusChange('error');
      const error = new Error('SSE connection failed');
      onError?.(error);
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      flushPending();
      if (isMountedRef.current) {
        handleStatusChange('disconnected');
      }
    };
  }, [url, handleStatusChange, onError, flushPending]);

  useEffect(() => {
    if (autoConnect) {
      return connect();
    }
  }, [autoConnect, connect]);

  return {
    events,
    filteredEvents,
    status,
    stats,
    selectedAgent,
    setSelectedAgent,
    connect,
  };
}
