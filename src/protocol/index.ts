/**
 * TraceScope Protocol Module
 * 
 * 标准化 Agent Trace 数据交换协议
 * 包含类型定义和适配器
 */

export * from './types';
export * from './adapters';

// 便捷创建函数
export {
  createNodeEvent,
  createStatusEvent,
  createMessageEvent,
  validateEvent,
} from './types';