import{createRequire}from'node:module';import path from'node:path';import assert from'node:assert/strict';
const{chromium}=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url)('playwright');
const browser=await chromium.launch({...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE}),headless:true});
try{
 for(const[width,height]of[[390,844],[320,568],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   const state={},viewport=new EventTarget();
   for(const[key,fallback]of Object.entries({width:()=>innerWidth,height:()=>innerHeight,offsetTop:()=>0,offsetLeft:()=>0,scale:()=>1}))Object.defineProperty(viewport,key,{get:()=>state[key]??fallback()});
   Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
   window.testViewport={set(values,event='resize'){Object.assign(state,values);viewport.dispatchEvent(new Event(event));}};
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(()=>scrollTo(0,320));const initial=await page.evaluate(()=>({y:scrollY,body:document.body.getAttribute('style'),overflow:document.documentElement.style.overflow}));assert.ok(initial.y>0);
  const trigger=page.locator('al-makhazen-assistant-widget button'),iframe=page.locator('al-makhazen-assistant-widget iframe'),frame=page.frameLocator('al-makhazen-assistant-widget iframe');
  await trigger.click();await frame.locator('.welcome').waitFor();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');assert.equal(await page.locator('al-makhazen-assistant-widget').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  const expectGeometry=async({top=0,left=0,width:expectedWidth=width,height:expectedHeight})=>{
   await page.waitForFunction(({top,left,width,height})=>{const box=document.querySelector('al-makhazen-assistant-widget').shadowRoot.querySelector('iframe').getBoundingClientRect();return box.top>top&&box.left>left&&box.right<left+width&&box.bottom<top+height&&box.height>=height*.8;},{top,left,width:expectedWidth,height:expectedHeight});
   const box=await iframe.boundingBox();assert.ok(box.x>=left+11&&box.x+box.width<=left+expectedWidth-11,'Website remains visible at both sides');assert.ok(box.y>top&&box.y+box.height<top+expectedHeight,'Website remains visible above and below chat');
   assert.ok(box.height>=expectedHeight*.8&&box.height<expectedHeight,'Chat uses most of the usable viewport without filling it');
   assert.equal(await iframe.evaluate(e=>parseFloat(getComputedStyle(e).borderRadius)),24);
   const metrics=await frame.locator('body').evaluate(()=>({viewport:innerHeight,scroll:document.scrollingElement.scrollHeight,scrollTop:document.scrollingElement.scrollTop,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   assert.equal(metrics.scrollTop,0);assert.ok(metrics.scroll<=metrics.viewport+1,JSON.stringify(metrics));assert.ok(metrics.scrollWidth<=metrics.width+1,JSON.stringify(metrics));
  };
  await expectGeometry({height});
  for(const visible of [Math.max(300,height-90),height,Math.max(280,height-55)]){await page.evaluate(h=>testViewport.set({height:h}),visible);await page.waitForTimeout(50);await expectGeometry({height:visible});}
  // Keyboard resize and the visual-viewport pan are distinct events in iOS.
  await frame.locator('#question').focus();const keyboardHeight=Math.max(230,height-350),keyboardTop=45;
  await page.evaluate(({height,top})=>testViewport.set({height,offsetTop:top}),{height:keyboardHeight,top:keyboardTop});await page.waitForTimeout(70);await expectGeometry({top:keyboardTop,height:keyboardHeight});
  const composer=await frame.locator('.composer').boundingBox();assert.ok(composer.y+composer.height<=keyboardTop+keyboardHeight,'Composer remains above keyboard');
  await page.evaluate(()=>testViewport.set({offsetTop:65},'scroll'));await page.waitForTimeout(50);await expectGeometry({top:65,height:keyboardHeight});
  await frame.locator('#question').blur();await page.evaluate(h=>testViewport.set({height:h,offsetTop:0}),height);await page.waitForTimeout(50);
  await frame.locator('#question').fill('Give me tabbouleh for 4');await frame.locator('.send').click();await frame.locator('.result-card .primary').waitFor();
  await frame.locator('.result-card .primary').click();
  const touch=async(top,dy)=>frame.locator('#messages').evaluate((node,{top,dy})=>{
   node.scrollTop=top==='bottom'?node.scrollHeight:top;getSelection().removeAllRanges();
   const touch=(y)=>new Touch({identifier:1,target:node,clientX:80,clientY:y});
   node.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(180)]}));
   return node.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[touch(180+dy)]}));
  },{top,dy});
  assert.equal(await touch(0,40),false,'Top-boundary drag cannot scroll the iframe document');
  assert.equal(await touch('bottom',-40),false,'Bottom-boundary drag cannot leak into the storefront');
  const canScroll=await frame.locator('#messages').evaluate(e=>e.scrollHeight>e.clientHeight+50);if(canScroll)assert.equal(await touch(25,-10),true,'Scrolling within the conversation remains enabled');
  await frame.locator('#list-toggle').click();await frame.locator('.list-item').first().waitFor();await page.evaluate(h=>testViewport.set({height:h-60}),height);await page.waitForTimeout(50);await expectGeometry({height:height-60});
  await frame.locator('#widget-close').tap();await iframe.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>scrollY),initial.y,'Closing restores the original storefront position');assert.equal(await page.evaluate(()=>document.body.getAttribute('style')||''),initial.body||'');
  await page.locator('#store-basket').click();const list=page.frameLocator('#store-list-frame');await list.locator('.list-item').first().waitFor();assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');const listScroll=await page.evaluate(()=>-parseFloat(document.body.style.top)||0);
  await page.evaluate(()=>testViewport.set({offsetTop:30,height:300}));await page.waitForTimeout(50);const modal=await page.locator('#store-dialog').boundingBox();assert.ok(Math.abs(modal.y-30)<1&&Math.abs(modal.height-300)<1);
  await list.locator('#list-close').tap();await page.locator('#store-dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>getComputedStyle(document.body).position==='static');assert.equal(await page.evaluate(()=>scrollY),listScroll);
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS scroll lock, toolbar/keyboard geometry, pane boundaries and restoration',width,height);await context.close();
 }
 // A real layout resize must also switch cleanly between desktop and floating mobile modes.
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:4173/');await page.evaluate(()=>scrollTo(0,250));
 await page.locator('al-makhazen-assistant-widget button').click();const frame=page.frameLocator('al-makhazen-assistant-widget iframe');await frame.locator('.welcome').waitFor();assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'static');
 for(const viewport of [{width:390,height:844},{width:844,height:390},{width:390,height:660}]){await page.setViewportSize(viewport);await page.waitForTimeout(70);const box=await page.locator('al-makhazen-assistant-widget iframe').boundingBox();assert.ok(box.width<=viewport.width-24&&box.height<viewport.height,'Floating margins survive rotation');assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');}
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'static');await frame.locator('#widget-close').click();await page.close();console.log('PASS desktop/mobile rotation and resize transitions');
}finally{await browser.close();}
