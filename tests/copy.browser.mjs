import{createRequire}from'node:module';import path from'node:path';import assert from'node:assert/strict';
const{chromium}=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url)('playwright');
const browser=await chromium.launch({...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE}),headless:true});
try{
 for(const[width,height]of[[390,844],[768,1024],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<1024,isMobile:width<600,permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto('http://127.0.0.1:4173/');await page.locator('al-makhazen-assistant-widget button').click();const frame=page.frameLocator('al-makhazen-assistant-widget iframe');await frame.locator('.welcome').waitFor();
  const input=frame.locator('#question');await input.fill('Do you have salt?');await frame.locator('.send').click();await frame.locator('.assistant .bubble').last().waitFor();await frame.locator('.send:not(:disabled)').waitFor();
  const reply=frame.locator('.assistant .bubble').last();assert.equal(await reply.evaluate(e=>getComputedStyle(e).userSelect),'text');
  assert.equal(await frame.locator('.user .bubble').evaluate(e=>getComputedStyle(e).userSelect),'text');
  await page.evaluate(()=>navigator.clipboard.writeText('__copy_test__'));
  await reply.dblclick({position:{x:10,y:10}});const word=await reply.evaluate(()=>String(getSelection()));assert.ok(word.trim().length);
  assert.equal(await reply.evaluate(()=>document.body.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))),true,'Native copy targeted at the document is allowed for selected reply text');
  await page.keyboard.press('ControlOrMeta+C');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),word);
  await page.keyboard.press('ControlOrMeta+A');const complete=await reply.innerText();assert.equal((await reply.evaluate(()=>String(getSelection()))).trim(),complete.trim());
  await page.keyboard.press('ControlOrMeta+C');await input.click();await input.press('ControlOrMeta+A');await input.press('ControlOrMeta+V');assert.equal(await input.inputValue(),complete,'Copied reply pastes into the message box');
  await frame.locator('#chat-title').evaluate(()=>getSelection().removeAllRanges());await frame.locator('#chat-title').dblclick();assert.equal(await frame.locator('body').evaluate(()=>String(getSelection())),'');
  for(const selector of ['#chat-title','.chat-heading p','.assistant-mark','#reset']){
   assert.equal(await frame.locator(selector).evaluate(e=>getComputedStyle(e).userSelect),'none',selector);
   assert.equal(await frame.locator(selector).evaluate(e=>e.dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))),false,selector);
  }
  await frame.locator('#reset').click();await input.fill('Give me tabbouleh for 4');await frame.locator('.send').click();await frame.locator('.result-card .primary').waitFor();
  await frame.locator('.steps summary').click();
  for(const selector of ['.card-intro h3','.product-row strong','.product-row small','.steps li']){
   const text=frame.locator(selector).first();assert.equal(await text.evaluate(e=>getComputedStyle(e).userSelect),'text',selector);
   assert.equal(await text.evaluate(e=>e.dispatchEvent(new Event('selectstart',{bubbles:true,cancelable:true}))),true,selector);
   assert.equal(await text.evaluate(e=>e.dispatchEvent(new Event('contextmenu',{bubbles:true,cancelable:true}))),true,selector);
  }
  assert.equal(await frame.locator('.result-card .primary').evaluate(e=>getComputedStyle(e).userSelect),'none');
  await frame.locator('.card-intro h3').dblclick({position:{x:10,y:9}});
  const titleSelection=await frame.locator('.card-intro h3').evaluate(()=>String(getSelection()));assert.ok(titleSelection.includes('Tabbouleh'),'Select actual title glyphs, not the blank area of a block heading');
  await page.keyboard.press('ControlOrMeta+C');assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),titleSelection);
  await frame.locator('.result-card .primary').click();await frame.locator('#list-toggle').click();assert.equal(await frame.locator('.list-description strong').first().evaluate(e=>getComputedStyle(e).userSelect),'text');
  assert.equal(await frame.locator('#list-title').evaluate(e=>getComputedStyle(e).userSelect),'none');
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS native chat/card copy, paste, and protected controls',width,height);await context.close();
 }
}finally{await browser.close();}
