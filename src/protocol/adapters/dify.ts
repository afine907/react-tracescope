/**
 * Dify 适配器
 * 
 * 将 Dify 工作流的 trace 格式转换为 TraceScope 标准协议格式
 * 
 * Dify 工作流 trace 格式:
 * {
 *   "node_id": "node_1",
 *   "node_type": "llm",
 *   "node_name": "AI 回复",
 *   "inputs": {...},
 *   "outputs": {...},
 *   "status": "succeeded",
 *   "execution_start_time": "2024-01-01T00:00:00Z",
 *   "execution_end_time": "2024-01-01T00:00:01Z"
 * }
 */

import type { 
  ProtocolEvent, 
  ProtocolAdapter,
  ProtocolNodeType,
  ProtocolNodeStatus,
  ProtocolNodeData
} from '../types';

// ============================================
// 类型定义
// ============================================

interface DifyNode {
  node_id?: string;
  node_type?: string;
  node_name?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  status?: string;
  execution_start_time?: string;
  execution_end_time?: string;
  children?: DifyNode[];
}

type DifyTrace = DifyNode | DifyNode[] | { data: DifyNode[] };

// ============================================
// 工具函数
// ============================================

/**
 * 映射 Dify 节点类型
 */
function mapDifyNodeType(type: string | undefined): ProtocolNodeType {
  if (!type) return 'custom';
  
  const typeMap: Record<string, ProtocolNodeType> = {
    'llm': 'llm',
    'model': 'llm',
    'chat-model': 'llm',
    'tool': 'tool',
    'tools': 'tool',
    'tool-node': 'tool',
    'conditional': 'condition',
    'condition': 'condition',
    'if-else': 'condition',
    'loop': 'loop',
    'loop-node': 'loop',
    'iteration': 'loop',
    'http': 'tool',
    'code': 'function',
    'code-node': 'function',
    'template': 'custom',
    'variable-aggregator': 'custom',
    'assigner': 'custom',
  };
  
  return typeMap[type.toLowerCase()] || 'custom';
}

/**
 * 映射 Dify 状态
 */
function mapDifyStatus(status: string | undefined): ProtocolNodeStatus {
  if (!status) return 'pending';
  
  const statusMap: Record<string, ProtocolNodeStatus> = {
    'running': 'running',
    'succeeded': 'completed',
    'failed': 'failed',
    'pending': 'pending',
    'skipped': 'cancelled',
  };
  
  return statusMap[status.toLowerCase()] || 'pending';
}

/**
 * 解析时间字符串为毫秒时间戳
 */
function parseTimestamp(timeStr: string | undefined): number | undefined {
  if (!timeStr) return undefined;
  
  try {
    return new Date(timeStr).getTime();
  } catch {
    return undefined;
  }
}

/**
 * 递归转换节点
 */
function convertNode(
  node: DifyNode, 
  parentId: string | undefined,
  events: ProtocolEvent[]
): void {
  const nodeId = node.node_id || `node-${Math.random()}`;
  const nodeType = mapDifyNodeType(node.node_type);
  const status = mapDifyStatus(node.status);
  
  const action = status === 'completed' ? 'complete' : 
                 status === 'failed' ? 'error' : 'start';
  
  const nodeData: ProtocolNodeData = {
    nodeId,
    parentId,
    nodeType,
    name: node.node_name || node.node_type || 'Unknown',
    status,
    input: node.inputs,
    output: node.outputs,
    startTime: parseTimestamp(node.execution_start_time),
    endTime: parseTimestamp(node.execution_end_time),
  };
  
  const event: ProtocolEvent = {
    id: node.node_id || `dify-${Date.now()}`,
    type: 'node',
    action,
    timestamp: parseTimestamp(node.execution_start_time) || Date.now(),
    data: nodeData,
  };
  
  events.push(event);
  
  // 递归处理子节点
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => convertNode(child, nodeId, events));
  }
}

// ============================================
// 适配器实现
// ============================================

export const difyAdapter: ProtocolAdapter = {
  name: 'dify',
  version: '1.0.0',
  
  transform(nativeTrace: DifyTrace): ProtocolEvent[] {
    const events: ProtocolEvent[] = [];
    
    if (!nativeTrace) {
      return events;
    }
    
    // 标准化输入
    let nodes: DifyNode[];
    
    if (Array.isArray(nativeTrace)) {
      nodes = nativeTrace;
    } else if ('data' in nativeTrace && Array.isArray((nativeTrace as { data: DifyNode[] }).data)) {
      nodes = (nativeTrace as { data: DifyNode[] }).data;
    } else {
      nodes = [nativeTrace as DifyNode];
    }
    
    nodes.forEach((node) => convertNode(node, undefined, events));
    
    // 添加会话状态
    if (events.length > 0) {
      const completedCount = events.filter(e => e.action === 'complete').length;
      const totalCount = events.length;
      
      events.unshift({
        id: 'dify-session-start',
        type: 'status',
        action: 'start',
        timestamp: events[0].timestamp,
        status: {
          sessionId: 'dify-session',
          status: 'running',
          completedNodes: 0,
          totalNodes: totalCount,
        },
      });
      
      const lastEvent = events[events.length - 1];
      if (lastEvent.action === 'complete') {
        events.push({
          id: 'dify-session-end',
          type: 'status',
          action: 'complete',
          timestamp: lastEvent.timestamp,
          status: {
            sessionId: 'dify-session',
            status: 'completed',
            completedNodes: completedCount,
            totalNodes: totalCount,
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

export default difyAdapter;