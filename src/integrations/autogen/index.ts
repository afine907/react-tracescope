/**
 * AutoGen Integration
 * 
 * 开箱即用的 AutoGen 集成包
 */

import { autogenAdapter } from '../../protocol/adapters';
import { 
  autogenMultiAgentTrace,
  autogenMultiAgentEvents,
  autogenSimpleChat,
  autogenCodeExecution,
  transformAutoGenEvents,
  type AutoGenEvent 
} from '../../examples/frameworks/autogen';

export type { AutoGenEvent } from '../../examples/frameworks/autogen';

export { autogenAdapter };

export {
  autogenMultiAgentTrace,
  autogenMultiAgentEvents,
  autogenSimpleChat,
  autogenCodeExecution,
  transformAutoGenEvents,
};

import { useCallback, useEffect, useState } from 'react';
import type { ProtocolEvent } from '../../protocol/types';
import type { TraceScopeConfig } from '../../types/config';

export interface AutoGenConfig {
  adapter?: string;
  autoConnect?: boolean;
  traceUrl?: string;
  onTraceUpdate?: (events: ProtocolEvent[]) => void;
}

export function useAutoGenEvents(events: AutoGenEvent[]): ProtocolEvent[] {
  const [protocolEvents, setProtocolEvents] = useState<ProtocolEvent[]>([]);

  useEffect(() => {
    if (events.length > 0) {
      setProtocolEvents(transformAutoGenEvents(events));
    } else {
      setProtocolEvents([]);
    }
  }, [events]);

  return protocolEvents;
}

export function useAutoGenStream(config: AutoGenConfig) {
  const [events, setEvents] = useState<ProtocolEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    if (!config.traceUrl) {
      setError(new Error('traceUrl is required'));
      setStatus('error');
      return;
    }

    setStatus('connecting');

    const eventSource = new EventSource(config.traceUrl);

    eventSource.onopen = () => {
      setStatus('connected');
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newEvents = autogenAdapter.extractEvents(data);
        
        setEvents(prev => {
          const updated = [...prev, ...newEvents];
          config.onTraceUpdate?.(updated);
          return updated;
        });
      } catch (e) {
        console.error('Failed to parse AutoGen trace:', e);
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setStatus('disconnected');
    };
  }, [config.traceUrl, config.onTraceUpdate]);

  const disconnect = useCallback(() => {
    setStatus('disconnected');
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (config.autoConnect && config.traceUrl) {
      const cleanup = connect();
      return cleanup;
    }
  }, [config.autoConnect, config.traceUrl, connect]);

  return {
    events,
    status,
    error,
    connect,
    disconnect,
    clear,
  };
}

export const PRESETS = {
  local: {
    traceUrl: 'http://localhost:8081/events',
    adapter: 'autogen',
  },
};

export function createAutoGenConfig(preset: 'local', options?: {
  traceUrl?: string;
  autoConnect?: boolean;
}): AutoGenConfig {
  const base = PRESETS[preset];
  
  return {
    ...base,
    traceUrl: options?.traceUrl || base.traceUrl,
    adapter: 'autogen',
    autoConnect: options?.autoConnect ?? true,
  };
}

export const AutoGenIntegration = {
  adapter: autogenAdapter,
  useEvents: useAutoGenEvents,
  useStream: useAutoGenStream,
  presets: PRESETS,
  createConfig: createAutoGenConfig,
};

export default AutoGenIntegration;