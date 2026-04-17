/**
 * LangChain Integration
 * 
 * 开箱即用的 LangChain 集成包
 * 包含适配器、React Hooks、类型定义和使用示例
 */

import { langchainAdapter } from '../../protocol/adapters';
import { 
  langchainAgentTrace, 
  langchainAgentEvents,
  langchainSimpleChain,
  transformLangChainTrace,
  type LangChainTrace 
} from '../../examples/frameworks/langchain';

// Re-export types
export type { LangChainTrace } from '../../examples/frameworks/langchain';

// ============================================
// 适配器
// ============================================

export { langchainAdapter };

// ============================================
// 示例数据
// ============================================

export {
  langchainAgentTrace,
  langchainAgentEvents,
  langchainSimpleChain,
  transformLangChainTrace,
};

// ============================================
// React Hooks
// ============================================

import { useCallback, useEffect, useState } from 'react';
import type { ProtocolEvent } from '../../protocol/types';
import type { TraceScopeConfig } from '../../types/config';

/**
 * 使用 LangChain trace 数据的 Hook
 * 
 * @param trace - LangChain trace 数据
 * @returns 转换后的 ProtocolEvent[]
 */
export function useLangChainTrace(trace: LangChainTrace | null): ProtocolEvent[] {
  const [events, setEvents] = useState<ProtocolEvent[]>([]);

  useEffect(() => {
    if (trace) {
      setEvents(transformLangChainTrace(trace));
    } else {
      setEvents([]);
    }
  }, [trace]);

  return events;
}

/**
 * LangChain 配置项
 */
export interface LangChainConfig {
  adapter?: string;
  autoConnect?: boolean;
  /** LangChain trace URL (SSE) */
  traceUrl?: string;
  /** 自定义回调 */
  onTraceUpdate?: (events: ProtocolEvent[]) => void;
}

/**
 * 使用 LangChain SSE 流的 Hook
 * 
 * @param config - 配置项
 * @returns 事件列表和连接状态
 */
export function useLangChainStream(config: LangChainConfig) {
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
        const newEvents = langchainAdapter.extractEvents(data);
        
        setEvents(prev => {
          const updated = [...prev, ...newEvents];
          config.onTraceUpdate?.(updated);
          return updated;
        });
      } catch (e) {
        console.error('Failed to parse LangChain trace:', e);
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

// ============================================
// 预设配置
// ============================================

/**
 * LangChain 预设配置
 */
export const PRESETS = {
  /** 本地开发 */
  local: {
    traceUrl: 'http://localhost:8000/trace/stream',
    adapter: 'langchain',
  },
  /** LangSmith 集成 */
  langsmith: (apiKey: string, traceUrl?: string) => ({
    traceUrl: traceUrl || `https://api.smith.langchain.com/traces/stream?api_key=${apiKey}`,
    adapter: 'langchain' as const,
  }),
};

/**
 * 创建 LangChain 配置
 */
export function createLangChainConfig(preset: 'local' | 'langsmith', options?: {
  apiKey?: string;
  traceUrl?: string;
  autoConnect?: boolean;
}): LangChainConfig {
  const base = preset === 'local' ? PRESETS.local : PRESETS.langsmith(options?.apiKey || '', options?.traceUrl);
  
  return {
    ...base,
    adapter: 'langchain',
    autoConnect: options?.autoConnect ?? true,
  };
}

// ============================================
// 使用示例
// ============================================

/**
 * 基本用法示例
 * 
 * ```tsx
 * import { TraceScopeProvider, TraceTree } from 'react-tracescope';
 * import { useLangChainStream } from 'react-tracescope/integrations/langchain';
 * 
 * function App() {
 *   const { events, status } = useLangChainStream({
 *     traceUrl: 'http://localhost:8000/trace/stream',
 *     adapter: 'langchain',
 *     autoConnect: true,
 *   });
 * 
 *   return (
 *     <TraceScopeProvider
 *       config={{ adapter: 'custom', autoConnect: false }}
 *       initialEvents={events}
 *     >
 *       <TraceTree />
 *     </TraceScopeProvider>
 *   );
 * }
 * ```
 * 
 * 带示例数据:
 * ```tsx
 * import { TraceScopeProvider, TraceTree } from 'react-tracescope';
 * import { langchainAgentEvents } from 'react-tracescope/integrations/langchain';
 * 
 * function App() {
 *   return (
 *     <TraceScopeProvider
 *       config={{ adapter: 'custom', autoConnect: false }}
 *       initialEvents={langchainAgentEvents}
 *     >
 *       <TraceTree />
 *     </TraceScopeProvider>
 *   );
 * }
 * ```
 */

// Named export for cleaner imports
export const LangChainIntegration = {
  adapter: langchainAdapter,
  useTrace: useLangChainTrace,
  useStream: useLangChainStream,
  presets: PRESETS,
  createConfig: createLangChainConfig,
};

export default LangChainIntegration;