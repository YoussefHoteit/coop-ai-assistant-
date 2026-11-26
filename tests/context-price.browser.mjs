import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE})});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const catalog=await (await fetch(base+'/api/catalog?q=eggs&limit=100')).json();
const products=catalog.products.filter(p=>p.available===true&&Number.isFinite(p.price));
const minimum=Math.min(...products.map(p=>p.price));
const maximum=Math.max(...products.map(p=>p.price));
const shown=products.slice(0,8);
try{
  for(const [width,height] of [[390,844],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const histories=[];let calls=0;
    await page.route('https://**/*',route=>route.abort());
    await page.route('**/api/chat',async route=>{
      const body=route.request().postDataJSON();histories.push(body.history);
      if(++calls===1){await route.fulfill({json:{text:'Here are the options we have.',language:'en',mode:'ai',products:shown,card:{kind:'products',items:shown.map(p=>({id:p.id})),comparisonContext:{queries:['eggs'],ids:shown.map(p=>p.id),basis:'pack'}}}});}
      else await route.continue();
    });
    await page.goto(base+'/');await page.locator('al-makhazen-assistant-widget button').click();
    const frame=page.frameLocator('al-makhazen-assistant-widget iframe');await frame.locator('.welcome').waitFor();
    const send=async(message,count)=>{
      await frame.locator('#question').fill(message);await frame.locator('.send').click();
      await frame.locator('.result-card').nth(count-1).waitFor();
      return frame.locator('.result-card').nth(count-1);
    };
    await send('What options do they have for eggs?',1);
    const cheapest=await send('what is the cheapest option',2);
    assert.ok((await cheapest.locator('.product-row small').allInnerTexts()).every(text=>text.includes('$'+minimum.toFixed(2))));
    assert.ok(await cheapest.locator('.add-button:enabled').first().isVisible());
    await cheapest.locator('.add-button:enabled').first().click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('makhazen-list-v1')));
    assert.equal(saved.length,1);assert.equal(saved[0].price,minimum);
    const expensive=await send('what is the most expensive option',3);
    assert.ok((await expensive.locator('.product-row small').allInnerTexts()).every(text=>text.includes('$'+maximum.toFixed(2))));
    assert.ok(await expensive.locator('.add-button:enabled').first().isVisible());
    for(const history of histories.slice(1))assert.ok(history.some(m=>m.role==='assistant'&&m.content.includes('"comparisonContext"')&&m.content.includes('"eggs"')));
    assert.deepEqual(errors,[]);console.log('PASS cheapest and most expensive interactive cards, same search context and shopping list',width,height);await page.close();
  }
}finally{await browser.close();}
