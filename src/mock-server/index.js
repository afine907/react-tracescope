/**
 * Mock SSE Server for StreamTrace Testing
 * Simulates agent streaming trace data with 5000+ nodes for stress testing
 */

const http = require('http');
const url = require('url');

// Generate UUID
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate large mock trace with 5000+ nodes
function generateLargeMockTrace(nodeCount = 5000) {
  const nodes = [];
  let seq = 1;
  const baseTime = Date.now();

  // Root node - user input
  const rootId = uuid();
  nodes.push({
    msgId: uuid(),
    type: 'node_create',
    data: {
      nodeId: rootId,
      parentId: null,
      nodeType: 'user_input',
      chunk: '请生成 ' + nodeCount + ' 个测试节点来测试性能',
      status: 'complete',
      agentId: 'stress-test-agent',
    },
    seq: seq++,
    timestamp: baseTime,
  });

  // Generate a tree structure with many branches
  const nodeTypes = ['assistant_thought', 'tool_call', 'code_execution', 'execution_result', 'final_output'];
  const codeSnippets = [
    'const result = arr.map(x => x * 2);',
    'function sort(a, b) { return a - b; }',
    'await fetch("/api/data");',
    'const data = JSON.parse(response);',
    'console.log("Processing...");',
    'for (let i = 0; i < n; i++) { sum += i; }',
    'if (condition) { return true; }',
    'while (hasNext()) { process(next()); }',
    'try { execute(); } catch (e) { log(e); }',
    'export default class Handler { }',
  ];

  let parentStack = [{ id: rootId, depth: 0 }];
  let nodeIndex = 1;

  // Create a deep tree with many branches
  while (nodes.length < nodeCount) {
    // Get a parent from the stack (preference for shallower nodes)
    const parentInfo = parentStack[Math.floor(Math.random() * Math.min(parentStack.length, 10))];
    const parentId = parentInfo.id;
    const depth = parentInfo.depth;

    // Choose node type
    const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    const nodeId = uuid();

    // Generate chunk content
    let chunk = '';
    if (nodeType === 'code_execution') {
      chunk = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    } else if (nodeType === 'tool_call') {
      const tools = ['search', 'fetch', 'compute', 'analyze', 'transform'];
      chunk = '调用工具: ' + tools[Math.floor(Math.random() * tools.length)];
    } else if (nodeType === 'assistant_thought') {
      const thoughts = ['思考中...', '分析问题中...', '查找解决方案...', '优化代码中...', '处理数据中...'];
      chunk = thoughts[Math.floor(Math.random() * thoughts.length)];
    } else if (nodeType === 'execution_result') {
      chunk = JSON.stringify({ status: 'success', data: Math.floor(Math.random() * 1000) });
    }

    // Create node
    const isLastBatch = nodes.length >= nodeCount - 100;
    nodes.push({
      msgId: uuid(),
      type: 'node_create',
      data: {
        nodeId: nodeId,
        parentId: parentId,
        nodeType: nodeType,
        chunk: chunk,
        status: isLastBatch ? 'complete' : (Math.random() > 0.3 ? 'streaming' : 'complete'),
        agentId: 'stress-test-agent',
      },
      seq: seq++,
      timestamp: baseTime + nodeIndex * 10,
    });

    // Add some content streaming for non-empty chunks
    if (chunk && Math.random() > 0.7) {
      const chunkId = uuid();
      nodes.push({
        msgId: chunkId,
        type: 'node_append',
        data: {
          nodeId: nodeId,
          chunk: ' + more data',
        },
        seq: seq++,
        timestamp: baseTime + nodeIndex * 10 + 5,
      });
    }

    // Mark as complete
    if (Math.random() > 0.5) {
      nodes.push({
        msgId: uuid(),
        type: 'node_append',
        data: {
          nodeId: nodeId,
          chunk: '',
          status: 'complete',
        },
        seq: seq++,
        timestamp: baseTime + nodeIndex * 10 + 8,
      });
    }

    // Add to parent stack if not too deep
    if (depth < 8 && Math.random() > 0.3) {
      parentStack.push({ id: nodeId, depth: depth + 1 });
    }

    // Trim stack if too large
    if (parentStack.length > 50) {
      parentStack = parentStack.slice(-30);
    }

    nodeIndex++;
  }

  // Final output
  const finalId = uuid();
  nodes.push({
    msgId: uuid(),
    type: 'node_create',
    data: {
      nodeId: finalId,
      parentId: rootId,
      nodeType: 'final_output',
      chunk: '压力测试完成！生成了 ' + nodes.length + ' 个节点',
      status: 'complete',
      agentId: 'stress-test-agent',
    },
    seq: seq++,
    timestamp: baseTime + nodeIndex * 10,
  });

  return nodes;
}

// Get node count from query param
function getNodeCount(parsedUrl) {
  const count = parsedUrl.query?.count || parsedUrl.query?.nodes;
  if (count) {
    const parsed = parseInt(count, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10000) {
      return parsed;
    }
  }
  return 5000; // Default to 5000 nodes
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE endpoint with configurable node count
  if (parsedUrl.pathname === '/api/agent/stream' || parsedUrl.pathname === '/stream') {
    const nodeCount = getNodeCount(parsedUrl);
    console.log(`[MockServer] Generating ${nodeCount} nodes...`);
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Send initial connection message
    res.write(`data: {"type":"connected","timestamp":${Date.now()},"nodeCount":${nodeCount}}\n\n`);

    // Generate large mock trace
    const mockTrace = generateLargeMockTrace(nodeCount);
    console.log(`[MockServer] Generated ${mockTrace.length} nodes, starting stream...`);
    
    // Send nodes with controlled delay to prevent overwhelming
    let sentCount = 0;
    const batchSize = 50; // Send 50 nodes per batch
    const batchDelay = 100; // ms between batches
    
    function sendBatch(startIndex) {
      const endIndex = Math.min(startIndex + batchSize, mockTrace.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(mockTrace[i])}\n\n`);
          sentCount++;
        }
      }
      
      if (endIndex < mockTrace.length) {
        setTimeout(() => sendBatch(endIndex), batchDelay);
      } else {
        // Send completion message
        setTimeout(() => {
          if (!res.writableEnded) {
            res.write(`data: {"type":"complete","timestamp":${Date.now()},"totalNodes":${sentCount}}\n\n`);
            console.log(`[MockServer] Stream complete, sent ${sentCount} nodes`);
          }
        }, 500);
      }
    }
    
    // Start sending after initial delay
    setTimeout(() => sendBatch(0), 500);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`: keepalive\n\n`);
      } else {
        clearInterval(keepAlive);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });

    return;
  }

  // Health check endpoint
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  // Config endpoint - shows available options
  if (parsedUrl.pathname === '/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      defaultNodes: 5000,
      maxNodes: 10000,
      queryParams: {
        count: 'Number of nodes to generate (1-10000)',
        nodes: 'Alias for count'
      }
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', endpoints: ['/stream', '/health', '/config'] }));
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`[MockServer] Running on http://localhost:${PORT}`);
  console.log(`[MockServer] SSE endpoint: http://localhost:${PORT}/stream`);
  console.log(`[MockServer] Default: 5000 nodes | Max: 10000 nodes`);
  console.log(`[MockServer] Tip: /stream?count=5000 to customize node count`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[MockServer] Shutting down...');
  server.close(() => {
    console.log('[MockServer] Server closed');
    process.exit(0);
  });
});