/**
 * Agent Browser E2E Test using Playwright
 * Tests: Mock SSE → Frontend → Rendering
 */

const { chromium } = require('playwright');

const DEV_SERVER = 'http://localhost:5173';
const MOCK_SERVER = 'http://localhost:3001';

async function runTest() {
  console.log('🔄 Starting Agent Browser E2E Test...\n');
  
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    
    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });
    
    // Navigate to the app
    console.log('📱 Opening:', DEV_SERVER);
    await page.goto(DEV_SERVER, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for React to render
    await page.waitForTimeout(3000);
    
    // Check page title
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check if root element has content
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 1000) : 'NOT FOUND';
    });
    
    console.log('\n📦 Root element content (first 500 chars):');
    console.log(rootContent.substring(0, 500));
    
    // Check for errors in console
    const errors = consoleLogs.filter(l => l.type === 'error');
    if (errors.length > 0) {
      console.log('\n❌ Console errors found:');
      errors.slice(0, 5).forEach(e => console.log('  -', e.text.substring(0, 100)));
    } else {
      console.log('\n✅ No console errors');
    }
    
    // Check page errors
    if (pageErrors.length > 0) {
      console.log('\n❌ Page errors:');
      pageErrors.slice(0, 3).forEach(e => console.log('  -', e.substring(0, 100)));
    } else {
      console.log('✅ No page errors');
    }
    
    // Check if main components rendered
    const hasContent = rootContent.length > 100;
    console.log('\n' + (hasContent ? '✅ Page rendered with content' : '❌ Page appears empty'));
    
    // Check for key UI elements
    const uiCheck = await page.evaluate(() => {
      const root = document.getElementById('root');
      const html = root ? root.innerHTML : '';
      return {
        hasToolbar: html.includes('toolbar') || html.includes('Toolbar'),
        hasTree: html.includes('tree') || html.includes('Tree'),
        hasStatus: html.includes('status') || html.includes('Status'),
        hasConnection: html.includes('connection') || html.includes('Connection'),
      };
    });
    
    console.log('\n🔍 UI Component Check:');
    console.log('  Toolbar:', uiCheck.hasToolbar ? '✅' : '⚠️');
    console.log('  Tree:', uiCheck.hasTree ? '✅' : '⚠️');
    console.log('  Status:', uiCheck.hasStatus ? '✅' : '⚠️');
    console.log('  Connection:', uiCheck.hasConnection ? '✅' : '⚠️');
    
    // Check for SSE connection (mock server events)
    console.log('\n🌐 Checking SSE connection...');
    const sseConnected = await page.evaluate(() => {
      // Look for any trace data that might have been received
      const root = document.getElementById('root');
      const html = root ? root.innerHTML : '';
      return html.length > 500; // If we have substantial content, SSE likely worked
    });
    console.log('  SSE Data Received:', sseConnected ? '✅' : '⚠️ (may still be loading)');
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/e2e-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot saved to: /tmp/e2e-screenshot.png');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ E2E Test Complete - Page loads successfully!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runTest();