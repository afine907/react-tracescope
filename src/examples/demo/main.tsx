/**
 * TraceScope Demo Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import DemoApp from './DemoApp';

// 样式
import '../../styles/demo.css';
import '../../styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);