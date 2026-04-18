# react-tracescope Development Tasks

## Version 1.0.0 - MVP Release

### ✅ Completed Features

#### Core (P0)
- [x] Project setup with TypeScript + Vite
- [x] Type definitions (node, tree, config, message)
- [x] SSE connection manager with reconnection
- [x] State manager with O(1) lookups
- [x] Tree builder with traversal support

#### React Integration (P0)
- [x] TraceScopeProvider context
- [x] Custom hooks (useNodes, useConnection, etc.)
- [x] TraceTree, TraceNode components
- [x] NodeHeader, NodeContent components

#### UI Features (P1)
- [x] Code highlighting (highlight.js)
- [x] Markdown rendering (marked)
- [x] Search & filter by type/status
- [x] Expand/collapse nodes
- [x] Connection status indicator
- [x] Toolbar with actions

#### Performance (P1)
- [x] Virtual scrolling (@tanstack/react-virtual)
- [x] Supports 5000+ nodes smoothly
- [x] Debounced updates (50ms)
- [x] Max nodes limit with eviction

#### Security (P0)
- [x] DOMPurify XSS protection
- [x] Markdown sanitization
- [x] Link security (noopener)
- [x] Error boundary for crash isolation

#### Code Quality (P1)
- [x] TypeScript strict mode
- [x] Debug logging (production silent)
- [x] Memory leak fixes
- [x] Proper package exports

---

## Build & Release

```bash
# Build
npm run build

# Output
dist/tracescope.es.js   66KB (17KB gzip)
dist/tracescope.cjs.js  42KB (14KB gzip)
dist/style.css          7KB  (1.6KB gzip)
```

---

## Usage

```tsx
import { VirtualTreeWithSearch } from 'react-tracescope';
import 'react-tracescope/style.css';

<VirtualTreeWithSearch
  tree={tree}
  height={600}
  showSearch={true}
/>
```

---

## Next Steps (v1.1.0)

- [ ] Unit tests with Jest
- [ ] E2E tests with Playwright
- [ ] Performance benchmarks
- [ ] Vue 3 adapter
- [ ] Svelte adapter