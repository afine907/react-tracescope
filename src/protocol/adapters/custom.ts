/**
 * 自定义 JSON 适配器 (默认)
 * 直接接收标准 ProtocolEvent 格式
 */

import type { ProtocolEvent, ProtocolAdapter } from '../types';

export const customAdapter: ProtocolAdapter = {
  name: 'custom',
  version: '1.0.0',
  
  transform(nativeTrace) {
    // nativeTrace 应该是 ProtocolEvent[] 或单个 ProtocolEvent
    if (Array.isArray(nativeTrace)) {
      return nativeTrace;
    }
    if (nativeTrace && typeof nativeTrace === 'object') {
      return [nativeTrace as ProtocolEvent];
    }
    return [];
  },
  
  extractEvents(rawData) {
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

export default customAdapter;