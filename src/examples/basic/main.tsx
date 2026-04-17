/**
 * TraceScope Example Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { DemoApp } from './App';

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a #root element in the HTML.');
}

// Create React root and render
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);

// Log startup
console.log('[TraceScope Demo] Application mounted');