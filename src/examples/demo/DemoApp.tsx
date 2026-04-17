/**
 * TraceScope Demo Application
 * 
 * 展示 TraceScope 核心功能的 Demo 页面
 */

import React, { useState, useCallback, useMemo } from 'react';

// 导入组件
import { 
  VirtualTreeWithSearch,
  ConnectionStatus,
  VirtualChat
} from '../../components';

// 导入类型
import type { 
  ProtocolEvent, 
  ProtocolMessageData 
} from '../../protocol/types';
import type { TreeNode } from '../../types/tree';

// 导入适配器
import { getAdapter } from '../../protocol/adapters';

// 样式
import '../../styles/demo.css';

// ============================================
// Mock 数据集
// ============================================

/**
 * LangChain 风格示例数据
 */
const langchainDemoData: ProtocolEvent[] = [
  {
    id: 'session-start',
    type: 'status',
    action: 'start',
    timestamp: Date.now() - 10000,
    status: {
      sessionId: 'demo-session',
      status: 'running',
      completedNodes: 0,
      totalNodes: 5,
    },
  },
  {
    id: 'node-1',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 9000,
    data: {
      nodeId: 'node-1',
      nodeType: 'user',
      name: '用户输入',
      status: 'running',
      input: '帮我查一下北京的天气',
    },
  },
  {
    id: 'node-2',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 8000,
    data: {
      nodeId: 'node-2',
      parentId: 'node-1',
      nodeType: 'llm',
      name: 'LLM 意图识别',
      status: 'running',
      input: '帮我查一下北京的天气',
      model: 'gpt-4',
    },
  },
  {
    id: 'node-2-complete',
    type: 'node',
    action: 'complete',
    timestamp: Date.now() - 5000,
    data: {
      nodeId: 'node-2',
      parentId: 'node-1',
      nodeType: 'llm',
      name: 'LLM 意图识别',
      status: 'completed',
      output: '用户想要查询天气，需要调用天气工具',
      model: 'gpt-4',
      tokenUsage: { input: 50, output: 30, total: 80 },
      endTime: Date.now() - 5000,
    },
  },
  {
    id: 'node-3',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 4000,
    data: {
      nodeId: 'node-3',
      parentId: 'node-2',
      nodeType: 'tool',
      name: '天气查询工具',
      status: 'running',
      toolName: 'get_weather',
      toolParams: { city: '北京' },
    },
  },
  {
    id: 'node-3-complete',
    type: 'node',
    action: 'complete',
    timestamp: Date.now() - 3000,
    data: {
      nodeId: 'node-3',
      parentId: 'node-2',
      nodeType: 'tool',
      name: '天气查询工具',
      status: 'completed',
      output: { temperature: 22, weather: '晴', humidity: 45 },
      endTime: Date.now() - 3000,
    },
  },
  {
    id: 'node-4',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 2000,
    data: {
      nodeId: 'node-4',
      parentId: 'node-3',
      nodeType: 'llm',
      name: 'LLM 总结回复',
      status: 'running',
      model: 'gpt-4',
    },
  },
  {
    id: 'node-4-complete',
    type: 'node',
    action: 'complete',
    timestamp: Date.now(),
    data: {
      nodeId: 'node-4',
      parentId: 'node-3',
      nodeType: 'llm',
      name: 'LLM 总结回复',
      status: 'completed',
      output: '根据查询结果，北京今天天气晴，气温22°C，适合外出。',
      model: 'gpt-4',
      tokenUsage: { input: 100, output: 50, total: 150 },
      endTime: Date.now(),
    },
  },
];

/**
 * AutoGen 风格示例数据
 */
const autogenDemoData: ProtocolEvent[] = [
  {
    id: 'autogen-session',
    type: 'status',
    action: 'start',
    timestamp: Date.now() - 15000,
    status: {
      sessionId: 'autogen-demo',
      status: 'running',
      completedNodes: 0,
      totalNodes: 4,
    },
  },
  {
    id: 'agent-user',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 14000,
    data: {
      nodeId: 'user',
      nodeType: 'user',
      name: 'User',
      status: 'completed',
      input: '帮我写一个 Python 脚本来自动化处理 Excel 文件',
    },
  },
  {
    id: 'agent-assistant',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 13000,
    data: {
      nodeId: 'assistant',
      parentId: 'user',
      nodeType: 'llm',
      name: 'Assistant Agent',
      status: 'running',
      input: '用户请求：帮我写一个 Python 脚本来自动化处理 Excel 文件',
      model: 'gpt-4',
    },
  },
  {
    id: 'tool-python',
    type: 'node',
    action: 'start',
    timestamp: Date.now() - 10000,
    data: {
      nodeId: 'python-exec',
      parentId: 'assistant',
      nodeType: 'function',
      name: 'Python Executor',
      status: 'running',
      toolName: 'python',
      toolParams: { code: 'import pandas as pd\n...\nprint("完成")' },
    },
  },
  {
    id: 'tool-python-result',
    type: 'node',
    action: 'complete',
    timestamp: Date.now() - 5000,
    data: {
      nodeId: 'python-exec',
      parentId: 'assistant',
      nodeType: 'function',
      name: 'Python Executor',
      status: 'completed',
      output: '处理完成\n\n处理的记录数: 1000\n输出文件: output.xlsx',
      endTime: Date.now() - 5000,
    },
  },
  {
    id: 'agent-assistant-complete',
    type: 'node',
    action: 'complete',
    timestamp: Date.now(),
    data: {
      nodeId: 'assistant',
      parentId: 'user',
      nodeType: 'llm',
      name: 'Assistant Agent',
      status: 'completed',
      output: '我已经为你编写了一个 Python 脚本...',
      model: 'gpt-4',
      tokenUsage: { input: 200, output: 100, total: 300 },
      endTime: Date.now(),
    },
  },
];

/**
 * Chat 示例数据
 */
const chatDemoMessages: ProtocolMessageData[] = [
  {
    messageId: 'msg-1',
    role: 'user',
    content: '你好，我想了解一下什么是 Agent',
    contentType: 'text',
    createdAt: Date.now() - 60000,
  },
  {
    messageId: 'msg-2',
    role: 'assistant',
    content: '<thinking>\n用户想了解什么是 Agent。\n</thinking>\n\nAgent（智能体）是一种能够自主感知环境、规划行动、执行任务的 AI 系统。\n\n与传统的问答式 AI 不同，Agent 具有以下特点：\n\n1. **自主规划** - 能够分解复杂任务\n2. **工具使用** - 可以调用外部工具\n3. **持续交互** - 能够进行多轮对话',
    contentType: 'markdown',
    createdAt: Date.now() - 55000,
    tokensReceived: 250,
  },
  {
    messageId: 'msg-3',
    role: 'user',
    content: '那 Agent 是怎么工作的？',
    contentType: 'text',
    createdAt: Date.now() - 30000,
  },
  {
    messageId: 'msg-4',
    role: 'assistant',
    content: 'Agent 的工作流程通常包括：\n\n1. 接收请求\n2. 理解意图\n3. 规划步骤\n4. 执行行动\n5. 评估结果\n\n需要我详细解释某个环节吗？',
    contentType: 'markdown',
    createdAt: Date.now() - 25000,
    tokensReceived: 180,
  },
];

// ============================================
// 主组件: Demo App
// ============================================

export default function DemoApp() {
  const [activeTab, setActiveTab] = useState<'tree' | 'chat' | 'settings'>('tree');
  const [selectedAdapter, setSelectedAdapter] = useState<string>('langchain');
  const [treeData, setTreeData] = useState<ProtocolEvent[]>(langchainDemoData);
  const [chatMessages, setChatMessages] = useState<ProtocolMessageData[]>(chatDemoMessages);
  
  // 转换事件数据为树结构
  const convertToTreeData = useCallback((events: ProtocolEvent[]): TreeNode[] => {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    
    // 第一遍：创建所有节点
    events.forEach(event => {
      if (event.type === 'node' && event.data) {
        const node: TreeNode = {
          nodeId: event.data.nodeId,
          data: {
            nodeId: event.data.nodeId,
            parentId: event.data.parentId,
            nodeType: event.data.nodeType as any,
            chunk: event.data.name || '',
            status: event.data.status as any,
            input: event.data.input,
            output: event.data.output,
            startTime: event.data.startTime,
            endTime: event.data.endTime,
            tokenUsage: event.data.tokenUsage,
            model: event.data.model,
            toolName: event.data.toolName,
            toolParams: event.data.toolParams,
          } as any,
          children: [],
          depth: 0,
          isExpanded: true,
        };
        nodeMap.set(node.nodeId, node);
      }
    });
    
    // 第二遍：构建父子关系
    events.forEach(event => {
      if (event.type === 'node' && event.data) {
        const node = nodeMap.get(event.data.nodeId);
        if (node) {
          if (event.data.parentId && nodeMap.has(event.data.parentId)) {
            const parent = nodeMap.get(event.data.parentId)!;
            parent.children.push(node);
          } else {
            roots.push(node);
          }
        }
      }
    });
    
    // 设置深度
    const setDepth = (nodes: TreeNode[], depth: number) => {
      nodes.forEach(node => {
        node.depth = depth;
        setDepth(node.children, depth + 1);
      });
    };
    setDepth(roots, 0);
    
    return roots.length > 0 ? roots : roots;
  }, []);
  
  const tree = useMemo(() => {
    const result = convertToTreeData(treeData);
    // 取第一个根节点作为 tree prop
    return result.length > 0 ? result[0] : null;
  }, [treeData, convertToTreeData]);
  
  // 切换适配器时更新示例数据
  const handleAdapterChange = useCallback((adapter: string) => {
    setSelectedAdapter(adapter);
    switch (adapter) {
      case 'langchain':
        setTreeData(langchainDemoData);
        break;
      case 'autogen':
        setTreeData(autogenDemoData);
        break;
      default:
        setTreeData(langchainDemoData);
    }
  }, []);
  
  // 模拟发送聊天消息
  const handleSendMessage = useCallback((content: string) => {
    const newUserMsg: ProtocolMessageData = {
      messageId: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      contentType: 'text',
      createdAt: Date.now(),
    };
    
    setChatMessages(prev => [...prev, newUserMsg]);
    
    // 模拟 AI 回复
    setTimeout(() => {
      const aiResponse: ProtocolMessageData = {
        messageId: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `这是一个模拟的回复："${content}"\n\nTraceScope 支持流式输出。`,
        contentType: 'markdown',
        createdAt: Date.now(),
        tokensReceived: Math.floor(Math.random() * 100) + 20,
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  }, []);
  
  // 统计数据
  const stats = useMemo(() => {
    const totalTokens = treeData
      .filter(e => e.data?.tokenUsage?.total)
      .reduce((sum, e) => sum + (e.data?.tokenUsage?.total || 0), 0);
    
    const completedNodes = treeData.filter(e => e.action === 'complete').length;
    const totalNodes = treeData.filter(e => e.type === 'node').length;
    
    return { totalTokens, completedNodes, totalNodes };
  }, [treeData]);
  
  return (
    <div className="demo-app">
      {/* Header */}
      <header className="demo-header">
        <h1>🤖 TraceScope Demo</h1>
        <p>Agent Trace 可视化标准方案</p>
      </header>
      
      {/* Tab 导航 */}
      <nav className="demo-tabs">
        <button 
          className={`tab ${activeTab === 'tree' ? 'active' : ''}`}
          onClick={() => setActiveTab('tree')}
        >
          🌳 Tree View
        </button>
        <button 
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat Mode
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>
      
      {/* 主内容区域 */}
      <main className="demo-content">
        {/* Tree View */}
        {activeTab === 'tree' && (
          <div className="tree-view">
            <div className="tree-info">
              <span>适配器: <strong>{selectedAdapter}</strong></span>
              <span>节点: {stats.totalNodes}</span>
              <span>已完成: {stats.completedNodes}</span>
              <span>Token: {stats.totalTokens}</span>
            </div>
            
            <div className="tree-container">
              <VirtualTreeWithSearch
                tree={tree}
                height={500}
                showSearch={true}
                showTypeFilter={true}
              />
            </div>
          </div>
        )}
        
        {/* Chat View */}
        {activeTab === 'chat' && (
          <div className="chat-view">
            <VirtualChat
              messages={chatMessages}
              config={{
                showThinking: true,
                showTokenUsage: true,
                showTimestamp: true,
                onSendMessage: handleSendMessage,
              }}
              height={500}
            />
          </div>
        )}
        
        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="settings-view">
            <h2>适配器设置</h2>
            
            <div className="setting-group">
              <label>选择适配器:</label>
              <select 
                value={selectedAdapter} 
                onChange={(e) => handleAdapterChange(e.target.value)}
              >
                <option value="custom">Custom (自定义)</option>
                <option value="langchain">LangChain</option>
                <option value="autogen">AutoGen</option>
                <option value="dify">Dify</option>
              </select>
            </div>
            
            <div className="setting-group">
              <label>当前适配器信息:</label>
              <div className="adapter-info">
                {(() => {
                  const adapter = getAdapter(selectedAdapter);
                  return adapter ? (
                    <>
                      <p>名称: {adapter.name}</p>
                      <p>版本: {adapter.version}</p>
                    </>
                  ) : (
                    <p>未找到适配器</p>
                  );
                })()}
              </div>
            </div>
            
            <h3>示例数据</h3>
            <div className="sample-buttons">
              <button onClick={() => handleAdapterChange('langchain')}>
                加载 LangChain 示例
              </button>
              <button onClick={() => handleAdapterChange('autogen')}>
                加载 AutoGen 示例
              </button>
            </div>
            
            <h3>性能指标</h3>
            <div className="perf-metrics">
              <div className="metric">
                <span className="label">节点数</span>
                <span className="value">{stats.totalNodes}</span>
              </div>
              <div className="metric">
                <span className="label">已完成</span>
                <span className="value">{stats.completedNodes}</span>
              </div>
              <div className="metric">
                <span className="label">Token 消耗</span>
                <span className="value">{stats.totalTokens}</span>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="demo-footer">
        <ConnectionStatus 
          state="connected" 
          
        />
        <span>•</span>
        <span>节点: {stats.totalNodes}</span>
        <span>•</span>
        <span>Token: {stats.totalTokens}</span>
        <span className="version">v1.0.0</span>
      </footer>
    </div>
  );
}