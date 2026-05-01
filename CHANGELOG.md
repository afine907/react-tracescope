# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-agent hierarchy support with `agentName` field
- Cost and token tracking (`cost`, `tokens` fields)
- Duration tracking per event
- Search and filter functionality
- Demo website on GitHub Pages
- Unit tests with vitest

### Changed
- Improved performance with CSS containment
- Enhanced UI with timestamp display
- Added copy button for tool args and results
- Collapsible tool arguments

## [2.0.0] - 2026-05-01

### Added
- Timeline view mode with collapsible events
- Virtual scrolling for 10,000+ events
- Dark/Light theme support
- Connection status indicator
- Error handling with callbacks
- TypeScript support
- Performance tests with Playwright

### Changed
- Renamed from `react-tracescope` to `agent-sse-flow`
- Improved markdown rendering with `react-markdown`
- Better SSE batching with requestAnimationFrame

## [1.0.0] - 2026-04-01

### Added
- Initial release
- Basic SSE streaming visualization
- Event types: start, thinking, tool_call, tool_result, message, error, end
- Virtual scrolling
- NPM package
