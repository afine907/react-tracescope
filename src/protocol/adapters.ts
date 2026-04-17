/**
 * TraceScope 适配器注册表
 * 
 * 支持多种 Agent 框架的数据格式转换
 * 每个适配器负责将框架原生格式转换为标准 ProtocolEvent[]
 */

import type { ProtocolAdapter } from './types';

// 导入所有内置适配器
import { customAdapter } from './adapters/custom';
import { langchainAdapter } from './adapters/langchain';
import { difyAdapter } from './adapters/dify';
import { autogenAdapter } from './adapters/autogen';

// 适配器注册表
const adapterRegistry: Map<string, ProtocolAdapter> = new Map([
  ['custom', customAdapter],
  ['langchain', langchainAdapter],
  ['dify', difyAdapter],
  ['autogen', autogenAdapter],
]);

/**
 * 注册新适配器
 */
export function registerAdapter(adapter: ProtocolAdapter): void {
  adapterRegistry.set(adapter.name, adapter);
}

/**
 * 获取适配器
 */
export function getAdapter(name: string): ProtocolAdapter | undefined {
  return adapterRegistry.get(name);
}

/**
 * 获取所有适配器名称
 */
export function getAdapterNames(): string[] {
  return Array.from(adapterRegistry.keys());
}

/**
 * 创建适配器实例
 * 支持传入自定义适配器或适配器名称
 */
export function createAdapter(adapter: string | ProtocolAdapter): ProtocolAdapter {
  // 自定义适配器对象
  if (typeof adapter === 'object' && adapter !== null && 'name' in adapter) {
    registerAdapter(adapter);
    return adapter;
  }
  
  // 适配器名称字符串
  const adapterName = adapter as string;
  const found = getAdapter(adapterName);
  if (!found) {
    console.warn(`Adapter "${adapterName}" not found, using custom adapter`);
    return customAdapter;
  }
  
  return found;
}

// 导出所有内置适配器
export {
  customAdapter,
  langchainAdapter,
  difyAdapter,
  autogenAdapter,
};