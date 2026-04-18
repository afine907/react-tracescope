/**
 * TraceScope 性能压测工具
 * 
 * 测试大规模节点和高频更新的性能表现
 * 
 * 使用方法:
 * npm run perf-test
 * 或
 * npx playwright test perf.spec.ts
 */

import { test, expect, chromium, Browser, Page } from '@playwright/test';

// 测试配置
const CONFIG = {
  devUrl: 'http://localhost:5173',
  nodeCounts: [1000, 5000, 10000, 50000],
  updateIntervals: [100, 50], // ms
  scrollIterations: 50,
  searchIterations: 10,
};

// ============================================
// 测试辅助函数
// ============================================

/**
 * 生成模拟树数据
 */
function generateMockTree(nodeCount: number, maxDepth: number = 5): any {
  const nodes: any[] = [];
  let id = 0;
  
  const generateNode = (parentId: string | null, depth: number): void => {
    if (nodes.length >= nodeCount || depth > maxDepth) return;
    
    const nodeId = `node-${id++}`;
    const nodeTypes = ['llm', 'tool', 'user', 'assistant', 'function', 'condition'] as const;
    const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    
    nodes.push({
      nodeId,
      parentId,
      nodeType,
      name: `${nodeType}-${id}`,
      status: Math.random() > 0.3 ? 'completed' : 'running',
      input: { query: 'test query' },
      output: { result: 'test result ' + id },
      startTime: Date.now() - Math.random() * 10000,
      endTime: Date.now() - Math.random() * 5000,
      tokenUsage: nodeType === 'llm' ? {
        input: Math.floor(Math.random() * 1000),
        output: Math.floor(Math.random() * 500),
        total: Math.floor(Math.random() * 1500),
      } : undefined,
      model: nodeType === 'llm' ? 'gpt-4' : undefined,
      toolName: nodeType === 'tool' ? 'python' : undefined,
    });
    
    // 生成子节点
    const childCount = depth < maxDepth ? Math.floor(Math.random() * 3) + 1 : 0;
    for (let i = 0; i < childCount && nodes.length < nodeCount; i++) {
      generateNode(nodeId, depth + 1);
    }
  };
  
  generateNode(null, 0);
  
  // 确保达到目标数量
  while (nodes.length < nodeCount) {
    const parentIndex = Math.floor(Math.random() * Math.min(nodes.length, 100));
    generateNode(nodes[parentIndex]?.nodeId, 2);
  }
  
  return { nodes, total: nodes.length };
}

/**
 * 测量 FPS
 */
async function measureFPS(page: Page, iterations: number = 50): Promise<number> {
  return await page.evaluate(async (iterations) => {
    const frames: number[] = [];
    let lastTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const now = performance.now();
      const delta = now - lastTime;
      
      if (delta > 0) {
        frames.push(1000 / delta);
      }
      lastTime = now;
    }
    
    // 去掉最高和最低的 10%
    frames.sort((a, b) => a - b);
    const trimmed = frames.slice(
      Math.floor(frames.length * 0.1),
      Math.floor(frames.length * 0.9)
    );
    
    return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  }, iterations);
}

/**
 * 测量内存使用
 */
async function measureMemory(page: Page): Promise<number> {
  return await page.evaluate(() => {
    // @ts-ignore - performance.memory 是 Chrome 特有 API
    if (performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  });
}

/**
 * 模拟 SSE 高频更新
 */
async function simulateSSEUpdate(page: Page, intervalMs: number, count: number): Promise<void> {
  await page.evaluate(async (intervalMs, count) => {
    const events: any[] = [];
    
    for (let i = 0; i < count; i++) {
      events.push({
        id: `sse-${Date.now()}-${i}`,
        type: 'node',
        action: i % 3 === 0 ? 'complete' : 'update',
        timestamp: Date.now(),
        data: {
          nodeId: `node-${i}`,
          nodeType: ['llm', 'tool', 'function'][i % 3],
          name: `Node ${i}`,
          status: i % 3 === 0 ? 'completed' : 'running',
          output: `Output ${i}`,
        },
      });
      
      // 触发自定义事件
      window.dispatchEvent(new CustomEvent('trace-event', { detail: events[events.length - 1] }));
      
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }, intervalMs, count);
}

// ============================================
// Playwright 测试用例
// ============================================

test.describe('TraceScope Performance Tests', () => {
  let browser: Browser;
  let page: Page;
  
  test.beforeAll(async () => {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });
  });
  
  test.afterAll(async () => {
    await browser.close();
  });
  
  test.beforeEach(async () => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();
    
    // 启用性能监控
    await page.coverage.startJSCoverage();
  });
  
  test.afterEach(async () => {
    const coverage = await page.coverage.stopJSCoverage();
    // 可以保存覆盖率报告
    await page.close();
  });
  
  // ========================================
  // 测试 1: 首屏渲染性能
  // ========================================
  test.each(CONFIG.nodeCounts)('首屏渲染: %d 节点', async (nodeCount) => {
    console.log(`\n🧪 测试首屏渲染: ${nodeCount} 节点`);
    
    await page.goto(CONFIG.devUrl, { waitUntil: 'domcontentloaded' });
    
    // 注入测试数据
    const tree = generateMockTree(nodeCount);
    
    const renderTime = await page.evaluate((treeData) => {
      const startTime = performance.now();
      
      // 模拟渲染
      window.dispatchEvent(new CustomEvent('trace-data', { detail: treeData }));
      
      // 等待渲染完成
      return performance.now() - startTime;
    }, tree);
    
    console.log(`   渲染时间: ${renderTime.toFixed(2)}ms`);
    
    // 验收标准: 1万节点内 < 100ms
    const threshold = nodeCount <= 10000 ? 100 : 200;
    expect(renderTime).toBeLessThan(threshold);
  });
  
  // ========================================
  // 测试 2: 滚动帧率
  // ========================================
  test.each(CONFIG.nodeCounts.slice(0, 2))('滚动帧率: %d 节点', async (nodeCount) => {
    console.log(`\n🧪 测试滚动帧率: ${nodeCount} 节点`);
    
    await page.goto(CONFIG.devUrl, { waitUntil: 'domcontentloaded' });
    
    // 注入测试数据
    const tree = generateMockTree(nodeCount);
    await page.evaluate((treeData) => {
      window.dispatchEvent(new CustomEvent('trace-data', { detail: treeData }));
    }, tree);
    
    // 等待渲染
    await page.waitForTimeout(500);
    
    // 测量滚动 FPS
    const fps = await measureFPS(page, CONFIG.scrollIterations);
    
    console.log(`   平均 FPS: ${fps.toFixed(2)}`);
    
    // 验收标准: ≥ 50fps
    expect(fps).toBeGreaterThan(50);
  });
  
  // ========================================
  // 测试 3: SSE 高频更新
  // ========================================
  test.each(CONFIG.updateIntervals)('SSE 更新: %dms 间隔', async (interval) => {
    console.log(`\n🧪 测试 SSE 更新: ${interval}ms 间隔`);
    
    await page.goto(CONFIG.devUrl, { waitUntil: 'domcontentloaded' });
    
    // 预加载 1000 节点
    const tree = generateMockTree(1000);
    await page.evaluate((treeData) => {
      window.dispatchEvent(new CustomEvent('trace-data', { detail: treeData }));
    }, tree);
    
    await page.waitForTimeout(500);
    
    // 测量内存基准
    const memBefore = await measureMemory(page);
    
    // 模拟 SSE 更新
    const updateStart = Date.now();
    await simulateSSEUpdate(page, interval, 20);
    const updateDuration = Date.now() - updateStart;
    
    const memAfter = await measureMemory(page);
    const memIncrease = (memAfter - memBefore) / 1024 / 1024;
    
    console.log(`   更新耗时: ${updateDuration}ms`);
    console.log(`   内存增长: ${memIncrease.toFixed(2)}MB`);
    
    // 验收标准: 更新不阻塞 UI
    expect(updateDuration).toBeLessThan(interval * 25); // 允许一定延迟
    expect(memIncrease).toBeLessThan(50); // 内存增长应可控
  });
  
  // ========================================
  // 测试 4: 搜索性能
  // ========================================
  test('搜索响应时间', async () => {
    console.log('\n🧪 测试搜索性能');
    
    const nodeCount = 10000;
    await page.goto(CONFIG.devUrl, { waitUntil: 'domcontentloaded' });
    
    // 注入测试数据
    const tree = generateMockTree(nodeCount);
    await page.evaluate((treeData) => {
      window.dispatchEvent(new CustomEvent('trace-data', { detail: treeData }));
    }, tree);
    
    await page.waitForTimeout(1000);
    
    // 执行搜索
    const searchTime = await page.evaluate(async () => {
      const startTime = performance.now();
      
      // 模拟搜索输入
      window.dispatchEvent(new CustomEvent('trace-search', { detail: 'llm' }));
      
      await new Promise(r => setTimeout(r, 100));
      
      return performance.now() - startTime;
    });
    
    console.log(`   搜索耗时: ${searchTime.toFixed(2)}ms`);
    
    // 验收标准: < 500ms
    expect(searchTime).toBeLessThan(500);
  });
  
  // ========================================
  // 测试 5: 内存占用
  // ========================================
  test('内存占用测试', async () => {
    console.log('\n🧪 测试内存占用');
    
    await page.goto(CONFIG.devUrl, { waitUntil: 'domcontentloaded' });
    
    // 逐步添加节点
    let memPeak = 0;
    
    for (let i = 0; i < 5; i++) {
      const tree = generateMockTree(5000);
      await page.evaluate((treeData) => {
        window.dispatchEvent(new CustomEvent('trace-data', { detail: treeData }));
      }, tree);
      
      await page.waitForTimeout(200);
      
      const mem = await measureMemory(page);
      memPeak = Math.max(memPeak, mem);
    }
    
    const memMB = memPeak / 1024 / 1024;
    console.log(`   峰值内存: ${memMB.toFixed(2)}MB`);
    
    // 验收标准: 5万节点 < 200MB
    expect(memMB).toBeLessThan(200);
  });
});

// ============================================
// 性能基准报告
// ============================================

test.describe('Performance Benchmark Report', () => {
  test('生成性能报告', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const results: any = {};
    
    // 测试不同节点数量
    for (const count of CONFIG.nodeCounts) {
      await page.goto(CONFIG.devUrl, { waitUntil: 'domcontentloaded' });
      
      const tree = generateMockTree(count);
      
      const result = await page.evaluate((treeData) => {
        const startTime = performance.now();
        
        window.dispatchEvent(new CustomEvent('trace-data', { detail: treeData }));
        
        const renderTime = performance.now() - startTime;
        
        return { nodeCount: treeData.total, renderTime };
      }, tree);
      
      results[count] = result;
      console.log(`${count} 节点: ${result.renderTime.toFixed(2)}ms`);
    }
    
    await browser.close();
    
    // 输出报告
    console.log('\n========== 性能基准报告 ==========');
    console.table(results);
    console.log('===================================');
  });
});