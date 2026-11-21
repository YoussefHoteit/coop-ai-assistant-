import {createRequire} from 'node:module';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(process.env.TASK_MODULES ? path.join(process.env.TASK_MODULES,'package.json') : import.meta.url);const {chromium}=require('playwright');
const browser=await chromium.launch({...(process.env.BROWSER_EXE && {executablePath:process.env.BROWSER_EXE}),headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 await page.goto('http://127.0.0.1:4173/assistant.html');
 for(const [message,language] of [['Do you have salt?','en'],['هل عندكم ملح؟','ar'],['3andkon 7alib?','arz'],['Avez-vous du lait ?','fr']]){
  await page.locator('#question').fill(message);await page.locator('.send').click();await page.waitForFunction(()=>!document.querySelector('.send').disabled,{},{timeout:15000});
  const reply=await page.locator('.message.assistant .bubble').last().getAttribute('lang');
  assert.equal(reply,language==='arz'?'ar-Latn-LB':language);assert.equal(await page.locator('html').getAttribute('dir'),language==='ar'?'rtl':'ltr');
  await page.locator('#list-toggle').click();
  assert.ok(await page.locator('#list-close').isVisible());
  assert.equal(await page.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`tmp/ui-qa/language-${language}.png`});await page.locator('#list-close').click();
  console.log('PASS language',language);
 }
 // Observe partial text before the final frame and inspect the next turn's conversation history.
 let release;const barrier=new Promise(resolve=>{release=resolve;});let count=0,observedBody;
 await page.route('**/api/chat',async route=>{
  observedBody=route.request().postDataJSON();count++;
  if(count===1){await route.fulfill({status:200,contentType:'application/x-ndjson',body:JSON.stringify({type:'text',delta:'A freshly prepared meal with pasta, chicken and a creamy sauce.',language:'en'})+'\n'+JSON.stringify({type:'result',reply:{text:'A freshly prepared meal with pasta, chicken and a creamy sauce. Here is the complete answer to your question.',language:'en',products:[],mode:'ai'}})+'\n'});}
  else {await barrier;await route.fulfill({json:{text:'$2.85',language:'en',priceOnly:true,products:[],mode:'ai'}});}
 });
 await page.locator('#question').fill('How can I make chicken Alfredo?');await page.locator('.send').click();
 await page.waitForFunction(()=>{const text=[...document.querySelectorAll('.message.assistant .bubble')].at(-1)?.textContent;return text?.startsWith('A freshly')&&text.length<110;});
 assert.equal(await page.locator('.send').isDisabled(),true,'Partial text appears while response is streaming');
 await page.waitForFunction(()=>!document.querySelector('.send').disabled);
 await page.locator('#question').fill('How much is it?');await page.locator('.send').click();await page.waitForTimeout(100);
 assert.ok(observedBody.history.some(m=>m.content.includes('creamy sauce')),'History sent on follow-up');
 await page.locator('#reset').click();release();await page.waitForTimeout(250);assert.equal(await page.locator('.message').count(),0,'Reset cancels late response');
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS partial streaming, history, reset cancellation');
 await context.close();
}finally{await browser.close();}
