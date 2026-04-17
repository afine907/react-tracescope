/**
 * Dify Integration
 * 
 * 开箱即用的 Dify 集成包
 */

import { difyAdapter } from '../../protocol/adapters';
import { 
  difyCustomerServiceWorkflow,
  difyCustomerServiceEvents,
  difySimpleChat,
  difyConditionalWorkflow,
  transformDifyEvents,
  type DifyEvent 
} from '../../examples/frameworks/dify';

export type { DifyEvent } from '../../examples/frameworks/dify';

export { difyAdapter };

export {
  difyCustomerServiceWorkflow,
  difyCustomerServiceEvents,
  difySimpleChat,
  difyConditionalWorkflow,
  transformDifyEvents,
};

import { useCallback, useEffect, useState } from 'react';
import type { ProtocolEvent } from '../../protocol/types';
import type { TraceScopeConfig } from '../../types/config';

export interface DifyConfig {
  adapter?: string;
  autoConnect?: boolean;
  apiKey?: string;
  baseUrl?: string;
  onTraceUpdate?: (events: ProtocolEvent[]) => void;
}

export function useDifyEvents(events: DifyEvent[]): ProtocolEvent[] {
  const [protocolEvents, setProtocolEvents] = useState<ProtocolEvent[]>([]);

  useEffect(() => {
    if (events.length > 0) {
      setProtocolEvents(transformDifyEvents(events));
    } else {
      setProtocolEvents([]);
    }
  }, [events]);

  return protocolEvents;
}

export function useDifyStream(config: DifyConfig) {
  const [events, setEvents] = useState<ProtocolEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    if (!config.apiKey) {
      setError(new Error('apiKey is required'));
      setStatus('error');
      return;
    }

    const baseUrl = config.baseUrl || 'https://api.dify.ai/v1';
    const url = `${baseUrl}/trace/stream?api_key=${config.apiKey}`;

    setStatus('connecting');

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setStatus('connected');
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const newEvents = difyAdapter.extractEvents(data);
        
        setEvents(prev => {
          const optimized = [...prev, ...newEvents];
          config.onTraceUpdate?.(optimized);
          return optimized;
        });
      } catch (e) {
        console.error('Failed to parse Dify trace:', e);
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
  }, [config.apiKey, config.baseUrl, config.onTraceUpdate]);

  const disconnect = useCallback(() => {
    setStatus('disconnected');
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (config.autoConnect && config.apiKey) {
      const cleanup = connect();
      return cleanup;
    }
  }, [config.autoConnect, config.apiKey, connect]);

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
  /** Dify Cloud */
  cloud: (apiKey: string) => ({
    apiKey,
    baseUrl: 'https://api.dify.ai/v1',
    adapter: 'dify',
  }),
  /** Dify Self-hosted */
  selfHosted: (apiKey: string, baseUrl: string) => ({
    apiKey,
    baseUrl,
    adapter: 'dify',
  }),
};

export function createDifyConfig(
  preset: 'cloud' | 'selfHosted', 
  options: { apiKey: string; baseUrl?: string; autoConnect?: boolean }
): DifyConfig {
  const base = preset === 'cloud' 
    ? PRESETS.cloud(options.apiKey)
    : PRESETS.selfHosted(options.apiKey, options.baseUrl || 'http://localhost:8080/v1');
  
  return {
    ...base,
    adapter: 'dify',
    autoConnect: options.autoConnect ?? true,
  };
}

export const DifyIntegration = {
  adapter: difyAdapter,
  useEvents: useDifyEvents,
  useStream: useDifyStream,
  presets: PRESETS,
  createConfig: createDifyConfig,
};

export default DifyIntegration;