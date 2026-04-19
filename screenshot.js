const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  // 点击 Tree View tab
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text && text.includes('Tree View')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      break;
    }
  }
  
  await page.screenshot({ path: '/tmp/demo-treeview.png', fullPage: true });
  
  // 点击 Chat Mode tab
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await btn.evaluate(el => el.textContent);
    if (text && text.includes('Chat Mode')) {
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      break;
    }
  }
  
  await page.screenshot({ path: '/tmp/demo-chat.png', fullPage: true });
  
  await browser.close();
  console.log('Screenshots saved');
})();
