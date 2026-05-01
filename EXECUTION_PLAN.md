# Agent SSE Flow - 今日执行计划

**目标**: 完成 Phase 1-3 所有核心任务

---

## 上午 (09:00-12:00)

### Task 1: Demo 网站部署 ✅
**优先级**: P0
**预计时间**: 30min

- [ ] 创建 `demo/` 分支
- [ ] 配置 GitHub Pages
- [ ] 创建在线演示页面 (index.html)
- [ ] 集成 Mock Server
- [ ] 添加主题切换按钮

### Task 2: 视觉素材 ✅
**优先级**: P0
**预计时间**: 30min

- [ ] 组件截图 (Dark/Light)
- [ ] Logo SVG
- [ ] Social Preview (1200x630)

### Task 3: 单元测试 ✅
**优先级**: P0
**预计时间**: 1.5h

- [ ] vitest 配置
- [ ] EventRow 测试
- [ ] TimelineRow 测试
- [ ] SSE 连接测试
- [ ] 虚拟滚动测试
- [ ] 覆盖率 > 80%

### Task 4: 社区文件 ✅
**优先级**: P1
**预计时间**: 30min

- [ ] CHANGELOG.md
- [ ] CODE_OF_CONDUCT.md
- [ ] Issue 模板 (.github/ISSUE_TEMPLATE/)
- [ ] PR 模板 (.github/PULL_REQUEST_TEMPLATE.md)

---

## 下午 (14:00-18:00)

### Task 5: 多 Agent 层级支持 🚀
**优先级**: P0
**预计时间**: 1.5h

- [ ] FlowEvent 添加 `agentName` 字段
- [ ] Agent 颜色映射
- [ ] 层级缩进显示
- [ ] Agent 过滤下拉框

### Task 6: 成本与时间追踪 📊
**优先级**: P1
**预计时间**: 1h

- [ ] FlowEvent 添加 `cost`, `tokens`, `duration` 字段
- [ ] Header 显示累计成本
- [ ] 事件显示耗时
- [ ] 总耗时统计

### Task 7: 搜索/过滤功能 🔍
**优先级**: P1
**预计时间**: 1h

- [ ] 关键词搜索框
- [ ] 事件类型过滤 (checkbox)
- [ ] Agent 过滤
- [ ] 过滤状态持久化

---

## 晚上 (19:00-22:00)

### Task 8: 集成示例 📚
**优先级**: P0
**预计时间**: 2h

- [ ] `examples/` 目录
- [ ] Python FastAPI 示例
- [ ] Node.js Express 示例
- [ ] Next.js App Router 示例
- [ ] OpenAI Assistant 适配器示例

### Task 9: README 更新 📖
**优先级**: P0
**预计时间**: 30min

- [ ] 添加截图/GIF
- [ ] 添加徽章
- [ ] 更新示例代码
- [ ] 添加 Contributors 部分

### Task 10: 发布准备 🚀
**优先级**: P0
**预计时间**: 30min

- [ ] 版本号更新 (v2.1.0)
- [ ] CHANGELOG 更新
- [ ] NPM 发布
- [ ] GitHub Release

---

## 执行顺序

```
上午:
  1. Demo 网站 (30min)
  2. 视觉素材 (30min)
  3. 单元测试 (1.5h)
  4. 社区文件 (30min)

下午:
  5. 多 Agent 层级 (1.5h)
  6. 成本时间追踪 (1h)
  7. 搜索过滤 (1h)

晚上:
  8. 集成示例 (2h)
  9. README 更新 (30min)
  10. 发布准备 (30min)
```

---

## 成功标准

- [ ] Demo 网站可访问
- [ ] 单元测试覆盖率 > 80%
- [ ] 所有新功能可用
- [ ] 5+ 集成示例
- [ ] NPM 发布 v2.1.0
- [ ] GitHub Release 发布

---

## 开始执行！

当前时间: 20:05
预计完成: 22:00

**Let's go! 🚀**
