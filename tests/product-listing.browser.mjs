import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE})});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
try{
  for(const [width,height] of [[390,844],[820,1180],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<900,isMobile:width<600});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const histories=[];
    await page.route('https://**/*',route=>route.abort());
    await page.route('**/api/chat',route=>{histories.push(route.request().postDataJSON().history);return route.continue();});
    await page.goto(base+'/');await page.locator('al-makhazen-assistant-widget button').click();
    const frame=page.frameLocator('al-makhazen-assistant-widget iframe');await frame.locator('.welcome').waitFor();
    const send=async(message,count)=>{
      await frame.locator('#question').fill(message);await frame.locator('.send').click();
      const card=frame.locator('.result-card').nth(count-1);await card.waitFor({timeout:20000});return card;
    };
    await frame.locator('#question').fill('what types of cheeses do you have');await frame.locator('.send').click();
    const discovery=frame.locator('.message.assistant .bubble').filter({hasText:'Which type are you interested in?'}).last();
    await discovery.waitFor({timeout:20000});
    // Wait for streaming to finish, then ensure discovery doesn't render SKUs.
    await frame.locator('.send:enabled').waitFor({timeout:20000});
    assert.match(await discovery.innerText(),/Akkawi.*Mozzarella.*Halloumi/s);
    assert.match(await discovery.innerText(),/Which type are you interested in/);
    assert.equal(await frame.locator('.result-card').count(),0);
    const all=await send('mozarela',1);
    assert.equal(await all.locator('.product-row').count(),20);
    const cheap=await send('what is the cheapest option',2);
    assert.match(await cheap.innerText(),/President.*mozarella[\s\S]*\$1\.97/i);
    await cheap.locator('.add-button').click();
    const list=await page.evaluate(()=>JSON.parse(localStorage.getItem('makhazen-list-v1')));
    assert.equal(list[0].price,1.97);
    const again=await send('list all available options',3);
    assert.equal(await again.locator('.product-row').count(),20);
    const broad=await send('list all available cheeses',4);
    assert.equal(await broad.locator('.product-row').count(),24);
    assert.match(await broad.locator('.card-intro').innerText(),/Showing 24 of \d+/);
    await broad.locator('.card-more').click();
    assert.equal(await broad.locator('.product-row').count(),48);
    assert.ok(histories[1].some(message=>message.role==='assistant'&&message.content.startsWith('{"kind":"types"')));
    for(const h of histories)for(const m of h)if(m.role==='assistant'&&m.content.startsWith('{'))assert.doesNotThrow(()=>JSON.parse(m.content.split('\n')[0]));
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}x${height}: type discovery, selected listing, paging, price, add-to-list and history`);
  }
}finally{await browser.close();}
