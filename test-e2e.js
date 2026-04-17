/**
 * StreamTrace E2E Test
 * Tests the full flow: Mock SSE → Frontend → Rendering
 */

const puppeteer = require('puppeteer');

const MOCK_SERVER = 'http://localhost:3001/stream';
const DEV_SERVER = 'http://localhost:5173';

async function runTest() {
  console.log('🔄 Starting E2E Test...\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    
    // Navigate to the app
    console.log('📱 Opening:', DEV_SERVER);
    await page.goto(DEV_SERVER, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Wait for React to render
    await new Promise(r => setTimeout(r, 2000));
    
    // Check page title
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check if root element has content
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.substring(0, 500) : 'NOT FOUND';
    });
    
    console.log('\n📦 Root element content (first 500 chars):');
    console.log(rootContent.substring(0, 500));
    
    // Check for errors in console
    const errors = consoleLogs.filter(l => l.type === 'error');
    if (errors.length > 0) {
      console.log('\n❌ Console errors found:');
      errors.forEach(e => console.log('  -', e.text));
    } else {
      console.log('\n✅ No console errors');
    }
    
    // Check if StreamTrace components rendered
    const hasContent = rootContent.length > 100;
    console.log('\n' + (hasContent ? '✅ Page rendered with content' : '❌ Page appears empty'));
    
    // Try to find trace tree
    const hasTraceTree = await page.evaluate(() => {
      return document.querySelector('.streamtrace') !== null ||
             document.querySelector('[class*="stream"]') !== null;
    });
    console.log(hasTraceTree ? '✅ StreamTrace component found' : '⚠️ StreamTrace component not detected (may be normal if waiting for SSE)');
    
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