# TraceScope 组件需求文档 - 交互稿参考

> 本文档用于交互稿设计参考，详细描述了 TraceScope 对外暴露的所有组件、Props、交互行为和视觉规范。

---

## 一、核心概念

### 1.1 节点类型 (Node Types)

| 类型 | 标识符 | 图标 | 边框色 | 用途 |
|------|--------|------|--------|------|
| User Input | `user_input` | User | indigo-500 | 用户输入/问题 |
| Assistant Thought | `assistant_thought` | Zap | purple-500 | Agent 推理/思考过程 |
| Tool Call | `tool_call` | Wrench | orange-500 | 工具/API 调用请求 |
| Code Execution | `code_execution` | Code | cyan-500 | 生成的代码/脚本 |
| Execution Result | `execution_result` | Terminal | emerald-500 | 工具/代码执行结果 |
| Final Output | `final_output` | CheckCircle | sky-500 | 最终响应 |
| Error | `error` | AlertCircle | red-500 | 错误状态 |

### 1.2 节点状态 (Node Status)

| 状态 | 视觉表现 | Badge 颜色 |
|------|----------|------------|
| streaming | 脉冲动画 + ... 逐字显示 | violet (bg-violet-100) |
| completed | 静态显示 | emerald (bg-emerald-100) |
| error | 错误图标 + 红色提示 | red (bg-red-100) |
| pending | 静态等待 | amber (bg-amber-100) |

### 1.3 连接状态 (Connection State)

| 状态 | 视觉表现 |
|------|----------|
| connecting | 加载动画 |
| connected | 绿色圆点 |
| disconnected | 灰色圆点 |
| error | 红色警告 |

---

## 二、组件清单

### 2.1 容器组件

#### TraceScopeView（主视图容器）

**功能**：顶层容器，整合所有子组件

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| showConnectionStatus | boolean | true | 显示连接状态指示器 |
| showToolbar | boolean | true | 显示工具栏 |
| className | string | - | 自定义类名 |
| style | CSSProperties | - | 自定义样式 |

**布局结构**：
```
┌─────────────────────────────────────────┐
│ [ConnectionStatus]     [Toolbar]        │ ← Header
├─────────────────────────────────────────┤
│                                         │
│           TraceTree                     │ ← Content
│                                         │
├─────────────────────────────────────────┤
│ "Waiting for trace data..."             │ ← Empty State (可选)
└─────────────────────────────────────────┘
```

**交互要点**：
- 空状态时显示 "Waiting for trace data..." 提示
- 错误时显示错误信息（带警告图标）
- 响应式布局，适配不同容器宽度

---

#### TraceScopeProvider（上下文提供者）

**功能**：React Context Provider，管理全局状态

**Props**：
| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| config | TraceScopeConfig | ✓ | 配置对象 |
| children | ReactNode | ✓ | 子组件 |

**Config 配置**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| url | string | - | SSE 端点 URL |
| headers | Record<string, string> | - | 自定义请求头 |
| agentId | string | - | 过滤指定 Agent ID |
| autoConnect | boolean | true | 挂载时自动连接 |
| onError | (error: Error) => void | - | 错误回调 |

---

### 2.2 树形组件

#### TraceTree（追踪树）

**功能**：渲染层级树结构

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| className | string | - | 自定义类名 |
| style | CSSProperties | - | 自定义样式 |

**视觉规范**：
- 使用 `role="tree"` 无障碍属性
- 支持键盘导航（方向键、Enter、Space）
- 自动处理虚拟根节点

---

#### TraceNode（追踪节点）

**功能**：单个追踪节点，支持递归渲染子节点

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| node | TreeNode | ✓ | 节点数据 |
| depth | number | ✓ | 嵌套深度 |
| className | string | - | 自定义类名 |
| showTimeline | boolean | false | 显示时间轴 |
| showTokens | boolean | false | 显示 Token 徽章 |
| showCost | boolean | false | 显示成本徽章 |
| minTime | number | - | 时间范围最小值 |
| maxTime | number | - | 时间范围最大值 |

**布局结构**：
```
┌─────────────────────────────────────────┐
│ [展开/收起] [Avatar] [Badge] [标题]      │ ← NodeHeader
│                        [Timeline] [Tokens] [Cost] [Status]
├─────────────────────────────────────────┤
│ 内容区域 (NodeContent)                   │
├─────────────────────────────────────────┤
│   ┊                                     │
│   ├─ Child Node 1                       │ ← 子节点（缩进 24px）
│   └─ Child Node 2                       │
└─────────────────────────────────────────┘
```

**交互行为**：
1. **展开/收起**：点击展开按钮或按 Space/Enter
2. **悬停效果**：边框变深，背景微调
3. **流式状态**：节点边框脉冲动画
4. **子节点连接线**：左侧灰色垂直线

**缩进规范**：
- 每层缩进：24px
- 连接线：left-3 (12px from left)

---

#### VirtualTree（虚拟滚动树）

**功能**：高性能虚拟滚动，支持 5000+ 节点

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| tree | TreeNode \| null | ✓ | 树数据 |
| height | number \| string | 600 | 容器高度 |
| width | number \| string | '100%' | 容器宽度 |
| indentSize | number | 24 | 缩进大小 |
| enableExpand | boolean | true | 启用展开功能 |
| initialExpanded | string[] | [] | 初始展开节点 |
| renderNode | function | - | 自定义渲染 |
| onNodeClick | function | - | 节点点击回调 |
| filter | function | - | 过滤函数 |

**VirtualTreeWithSearch 扩展 Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| showSearch | boolean | true | 显示搜索框 |
| searchPlaceholder | string | 'Search nodes...' | 搜索占位符 |
| showTypeFilter | boolean | true | 显示类型过滤 |

**布局结构**：
```
┌─────────────────────────────────────────┐
│ [🔍] [Search Input...] [Type ▼] [✕]    │ ← 搜索工具栏
├─────────────────────────────────────────┤
│ ┌───────────────────────────────────┐   │
│ │ Node 1                            │   │ ← 虚拟滚动区域
│ │   Node 1.1                        │   │
│ │   Node 1.2                        │   │
│ │ Node 2                            │   │
│ │ ...                               │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 1523 nodes (filtered)                   │ ← 节点计数
└─────────────────────────────────────────┘
```

---

### 2.3 节点子组件

#### NodeHeader（节点头部）

**功能**：节点标题行，包含类型标识、状态等

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| node | StreamNode | ✓ | 节点数据 |
| isExpanded | boolean | ✓ | 是否展开 |
| hasChildren | boolean | ✓ | 是否有子节点 |
| onToggleExpand | function | - | 展开切换回调 |
| showTimeline | boolean | false | 显示时间轴 |
| showTokens | boolean | false | 显示 Token |
| showCost | boolean | false | 显示成本 |
| minTime | number | - | 时间范围最小值 |
| maxTime | number | - | 时间范围最大值 |

**布局结构**：
```
[▸] [Avatar] [Badge] [标题文本...]  [Timeline] [Tokens] [Cost] [Status]
│    │        │       │              │          │        │      │
│    │        │       │              │          │        │      └─ 状态徽章
│    │        │       │              │          │        └─ 成本徽章
│    │        │       │              │          └─ Token 徽章
│    │        │       │              └─ 时间进度条
│    │        │       └─ 节点名称（截断）
│    │        └─ 类型 Badge
│    └─ 类型图标
└─ 展开/收起按钮
```

---

#### NodeContent（节点内容）

**功能**：节点内容展示，支持代码高亮和 Markdown

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| content | string | ✓ | 内容文本 |
| status | NodeStatus | 'streaming' | 节点状态 |
| nodeType | string | - | 节点类型 |
| enableMarkdown | boolean | true | 启用 Markdown |
| enableHighlight | boolean | true | 启用代码高亮 |

**内容类型自动识别**：
1. **代码内容**：检测 `import|export|const|function|class|def` 等关键字
2. **Markdown 内容**：检测 `#`、```、`**`、`[]` 等
3. **纯文本**：默认渲染

**流式状态视觉**：
```
Streaming:  ... (三个点逐个显示动画)
Complete:   完整内容
Error:      ⚠️ Execution failed
```

---

### 2.4 工具栏组件

#### Toolbar（工具栏）

**功能**：搜索、过滤、连接控制

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| className | string | - | 自定义类名 |
| showFilters | boolean | true | 显示过滤控件 |

**布局结构**：
```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] [Search...] [Type ▼] [Status ▼] 12/150 nodes [✕] │ │ 🔄 │ ⏹️ │ 🗑️ │
└─────────────────────────────────────────────────────────────┘
```

**操作按钮**：
| 按钮 | 图标 | 功能 |
|------|------|------|
| Reconnect | 🔄 | 重新连接 SSE |
| Disconnect | ⏹️ | 断开连接 |
| Clear | 🗑️ | 清空所有数据 |

**过滤选项**：
- **类型过滤**：All Types, User Input, Thought, Tool Call, Code, Result, Output, Error
- **状态过滤**：All Status, Streaming, Complete, Error

---

### 2.5 状态组件

#### StatusIndicator（状态指示器）

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| status | NodeStatus | - | 节点状态 |
| className | string | - | 自定义类名 |

---

#### ConnectionStatus（连接状态）

**功能**：显示当前连接状态和节点数量

**Props**：
| 属性 | 类型 | 说明 |
|------|------|------|
| state | ConnectionState | 连接状态 |
| nodeCount | number | 节点数量 |

---

### 2.6 原子组件（Primitives）

#### Badge（徽章）

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| label | ReactNode | ✓ | 内容 |
| size | 'xs' \| 'sm' \| 'md' \| 'lg' | 'sm' | 尺寸 |
| iconStart | ReactElement | - | 起始图标 |
| iconEnd | ReactElement | - | 结束图标 |
| unstyled | boolean | false | 禁用默认样式 |

**尺寸规范**：
| Size | 高度 | 内边距 | 字号 |
|------|------|--------|------|
| xs | 16px | px-1 | 10px |
| sm | 20px | px-1.5 | 12px |
| md | 24px | px-2 | 14px |
| lg | 28px | px-2.5 | 14px |

---

#### Status（状态徽章）

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| status | NodeStatus | ✓ | 状态类型 |
| variant | 'dot' \| 'badge' | 'dot' | 变体 |
| showLabel | boolean | false | 显示文字 |

**Dot 变体**：
```
●  streaming (violet, pulse animation)
●  completed (emerald)
●  error (red)
●  pending (amber)
```

**Badge 变体**：
```
[⋯]  streaming (violet bg)
[✓]  completed (emerald bg)
[!]  error (red bg)
[i]  pending (amber bg)
```

---

#### Avatar（头像图标）

**Props**：
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| nodeType | NodeTypeName | ✓ | 节点类型 |
| size | 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' | 'sm' | 尺寸 |
| icon | ReactElement | - | 自定义图标 |
| rounded | 'none' \| 'sm' \| 'md' \| 'lg' \| 'full' | 'sm' | 圆角 |

**尺寸规范**：
| Size | 容器 | 图标 |
|------|------|------|
| xs | 16px | 10px |
| sm | 20px | 12px |
| md | 24px | 16px |
| lg | 32px | 20px |
| xl | 40px | 24px |

**类型颜色**：
| Type | 背景色 |
|------|--------|
| user_input | bg-indigo-500 |
| assistant_thought | bg-purple-500 |
| tool_call | bg-orange-500 |
| code_execution | bg-cyan-500 |
| execution_result | bg-emerald-500 |
| final_output | bg-sky-500 |
| error | bg-red-500 |

---

#### Timeline（时间轴）

**功能**：节点执行时间进度条

**Props**：
| 属性 | 类型 | 说明 |
|------|------|------|
| startTime | number | 开始时间戳 |
| endTime | number | 结束时间戳 |
| minTime | number | 时间范围最小值 |
| maxTime | number | 时间范围最大值 |
| nodeType | NodeTypeName | 节点类型（决定颜色） |
| width | number | 宽度 |

---

#### TokensBadge（Token 徽章）

**功能**：显示 Token 使用量

---

#### PriceBadge（价格徽章）

**功能**：显示成本金额

---

## 三、Hooks API

| Hook | 返回值 | 用途 |
|------|--------|------|
| useTraceScope() | 完整状态 + 方法 | 主 Hook |
| useTraceNode(nodeId) | StreamNode \| undefined | 获取单个节点 |
| useTraceTree() | TreeNode \| null | 获取树结构 |
| useConnectionState() | ConnectionState | 连接状态 |
| useNodes() | NodeMap | 所有节点 |
| useError() | Error \| null | 错误信息 |
| useConnection() | { connect, disconnect, reconnect, reset } | 连接控制 |
| useNodeExpanded(nodeId) | { isExpanded, toggle } | 展开状态 |
| useStreamingStatus() | { streamingCount, completeCount, ... } | 流式统计 |
| useFilteredNodes(options) | { filtered, filteredCount, totalCount } | 过滤节点 |

---

## 四、交互规范

### 4.1 键盘导航

| 按键 | 行为 |
|------|------|
| ↑ / ↓ | 节点间导航 |
| ← / → | 收起 / 展开 |
| Enter / Space | 切换展开状态 |
| Tab | 焦点移动 |

### 4.2 悬停效果

- **节点卡片**：边框变深，轻微阴影
- **展开按钮**：图标颜色变深
- **Badge**：无悬停效果
- **工具栏按钮**：背景变浅

### 4.3 动画

| 动画 | 时长 | 触发条件 |
|------|------|----------|
| 展开箭头旋转 | 200ms | 展开状态切换 |
| 节点边框脉冲 | 持续 | streaming 状态 |
| 状态点脉冲 | 持续 | streaming 状态 |
| 内容淡入 | 200ms | 节点创建 |

---

## 五、响应式规范

| 断点 | 布局调整 |
|------|----------|
| < 640px | 隐藏 Timeline、Tokens、Cost；工具栏紧凑 |
| 640px - 1024px | 显示所有信息；标准间距 |
| > 1024px | 支持多列布局 |

---

## 六、无障碍规范

- 使用 `role="tree"` 和 `role="treeitem"` 语义
- 提供 `aria-expanded` 状态
- 提供 `aria-label` 标签
- 支持键盘导航
- 状态变化提供屏幕阅读器提示

---

## 七、设计参考

### 7.1 节点卡片示例

```
┌──────────────────────────────────────────────────────────┐
│ ▼ [🤖] [THOUGHT] Analyzing user request...     [⋯] [streaming] │
│                                                          │
│ I need to break down this problem into several steps...  │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │ ▸ [🔧] [TOOL] search_web                         │   │
│   │     query: "React performance optimization"      │   │
│   └──────────────────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────────────┐   │
│   │ ▸ [▶] [RESULT] Found 15 relevant articles        │   │
│   └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 7.2 工具栏示例

```
┌──────────────────────────────────────────────────────────────┐
│ [🔍] [Search nodes...        ] [All Types ▼] [All Status ▼]  │
│ 23/156 nodes                                           [✕]  │
├──────────────────────────────────────────────────────────────┤
│ [🔄] [⏹️] [🗑️]                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 八、总结

TraceScope 提供了完整的 AI Agent 执行追踪可视化解决方案，核心特性：

1. **分层架构**：Provider → Tree → Node → Primitives
2. **高性能**：虚拟滚动支持 5000+ 节点
3. **流式支持**：SSE 实时更新，动画反馈
4. **灵活定制**：支持自定义渲染、主题配置
5. **无障碍**：完整的键盘导航和 ARIA 支持

---

*文档版本: 1.0.0*
*生成日期: 2026-04-19*
