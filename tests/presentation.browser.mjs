import {createRequire} from 'node:module';import path from 'node:path';import assert from 'node:assert/strict';
const {chromium}=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url)('playwright');
const browser=await chromium.launch({...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE}),headless:true});
try{
 for(const [width,height] of [[390,844],[768,1024],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<1024,isMobile:width<600});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  let release;const paused=new Promise(resolve=>{release=resolve;});
  await page.route('**/app.js',async route=>{await paused;await route.continue();});
  await page.goto('http://127.0.0.1:4173/');
  assert.equal(await page.locator('al-makhazen-assistant-widget button').evaluate(e=>e.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))),false,'Launcher content also blocks copying');
  await page.locator('#store-basket').click();
  const list=page.frameLocator('#store-list-frame');await list.locator('#shopping-list').waitFor({state:'visible'});
  assert.equal(await list.locator('#chat').isVisible(),false,'No chat even before the module is delivered');
  assert.equal(await list.locator('html').getAttribute('data-view'),'list');
  await page.waitForTimeout(700);assert.equal(await list.locator('#chat').isVisible(),false,'Slow JS cannot cause an agent flash');
  assert.equal(await list.locator('#tab-recipe,#tab-all,#copy').count(),0);
  release();await list.locator('.empty-list').waitFor();
  assert.equal(await list.locator('#list-title').evaluate(e=>getComputedStyle(e).userSelect),'none');
  assert.equal(await list.locator('#list-title').evaluate(e=>e.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))),false);
  await list.locator('#list-title').dblclick();assert.equal(await list.locator('body').evaluate(()=>String(getSelection())), '');
  await list.locator('#list-close').click();
  await page.locator('al-makhazen-assistant-widget button').click();const chat=page.frameLocator('al-makhazen-assistant-widget iframe');await chat.locator('.welcome').waitFor();
  assert.equal(await chat.locator('.welcome h1').evaluate(e=>e.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))),false);
  assert.equal(await chat.locator('.welcome h1').evaluate(e=>e.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))),false);
  const input=chat.locator('#question');await input.fill('my own message');
  assert.equal(await input.evaluate(e=>getComputedStyle(e).userSelect),'text');
  assert.equal(await input.evaluate(e=>e.dispatchEvent(new Event('paste',{bubbles:true,cancelable:true}))),true,'User message paste is preserved');
  await input.press('ControlOrMeta+A');assert.equal(await input.evaluate(e=>e.selectionEnd-e.selectionStart),14,'Message editing remains selectable');
  assert.equal(await chat.locator('.welcome h1').evaluate(e=>e.dispatchEvent(new Event('paste',{bubbles:true,cancelable:true}))),false);
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS no-flash slow-loading list and content selection',width,height);await context.close();
 }
}finally{await browser.close();}
