const axios = require('./node_modules/axios');
const { chromium } = require('./node_modules/playwright');

const MESSAGE  = 'Hftg';
const CONV_URL = 'https://www.etsy.com/messages/1635070082';
const PROFILE  = 'k16kmi55';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

async function run() {
  console.log('Opening profile...');
  const res = await axios.get('http://127.0.0.1:50325/api/v1/browser/start?user_id=' + PROFILE);
  const wsUrl = res.data && res.data.data && res.data.data.ws && res.data.data.ws.puppeteer;
  if (!wsUrl) {
    console.log('Profile error:', JSON.stringify(res.data));
    return;
  }
  console.log('Waiting for browser to be ready...');
  await delay(5000);
  console.log('Connecting to browser...');
  const browser = await chromium.connectOverCDP(wsUrl, { timeout: 60000 });
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] || await ctx.newPage();

  console.log('Navigating to conversation...');
  try {
    await page.goto(CONV_URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
  } catch(e) {
    console.log('Navigation warning:', e.message.substring(0, 80));
  }
  await delay(5000);
  console.log('Current URL:', page.url());

  // Screenshot before anything
  await page.screenshot({ path: 'C:/etsy/step1-loaded.png' });
  console.log('Step 1 screenshot saved');

  // Find textarea
  const ta = await page.$('textarea[placeholder="Type your reply"]');
  if (!ta) {
    console.log('Textarea NOT found! Saving page...');
    const html = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Page text:', html);
    await browser.close();
    return;
  }
  console.log('Textarea found!');

  // Click textarea via JS (bypasses stability check)
  await page.evaluate(() => {
    const ta = document.querySelector('textarea[placeholder="Type your reply"]');
    if (ta) { ta.focus(); ta.click(); }
  });
  await delay(rand(500, 800));

  // Type message
  for (const ch of MESSAGE) {
    await page.keyboard.type(ch, { delay: rand(60, 120) });
  }
  await delay(rand(600, 1000));

  // Check textarea value
  const val = await page.$eval('textarea[placeholder="Type your reply"]', el => el.value).catch(() => 'error');
  console.log('Textarea value:', val);

  // Screenshot before send
  await page.screenshot({ path: 'C:/etsy/step2-typed.png' });
  console.log('Step 2 screenshot saved (before send)');

  // Find and click Send button
  const sendResult = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const labels = allBtns.map(b => b.textContent && b.textContent.trim()).filter(Boolean);
    const sendBtn = allBtns.find(b => b.textContent && b.textContent.trim() === 'Send');
    if (sendBtn) {
      sendBtn.click();
      return 'CLICKED';
    }
    return 'NOT FOUND - available: ' + labels.join(', ');
  });
  console.log('Send button:', sendResult);

  await delay(4000);

  // Screenshot after send
  await page.screenshot({ path: 'C:/etsy/step3-after-send.png' });
  console.log('Step 3 screenshot saved (after send)');

  // Check page text to see if message appears
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('Page after send:', pageText);

  await browser.close();
  await axios.get('http://127.0.0.1:50325/api/v1/browser/stop?user_id=' + PROFILE).catch(() => {});
  console.log('Profile closed. Done!');
}

run().catch(e => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
