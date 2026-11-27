import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE})});
const inProcess=process.env.IN_PROCESS_BROWSER==='1';
const base=process.env.TEST_BASE_URL||(inProcess?'https://local.coop.test':'http://127.0.0.1:4173');
const localWorker=inProcess?(await import('../dist/server/index.js')).default:null;
const originalFetch=globalThis.fetch;
if(inProcess)globalThis.fetch=async()=>{throw new Error('Unexpected external request during deterministic browser test');};
try{
  for(const [width,height] of [[390,844],[820,1180],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<900,isMobile:width<600});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const histories=[];
    await page.route('https://**/*',route=>route.abort());
    // Optional in-process transport for environments that block loopback.
    // Serve the very same built worker and real UI without accessing a network.
    if(localWorker)await page.route(base+'/**',async route=>{
      const request=route.request(),method=request.method(),body=request.postDataBuffer();
      const response=await localWorker.fetch(new Request(request.url(),{method,headers:request.headers(),...(!['GET','HEAD'].includes(method)&&body?{body}:{})}),{OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'});
      await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
    });
    await page.route('**/api/chat',route=>{histories.push(route.request().postDataJSON().history);return inProcess?route.fallback():route.continue();});
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
    const turkey=await send('Do you have turkey?',5);
    assert.equal(await turkey.locator('.product-row').count(),8);
    assert.doesNotMatch(await turkey.innerText(),/cat food|dog food|Friskies|Miglior|My Dog|Best Cat/i);
    const hotDogs=await send('List all available hot dogs',6);
    assert.equal(await hotDogs.locator('.product-row').count(),5);
    assert.doesNotMatch(await hotDogs.innerText(),/bread|bun/i);
    const hotDogBuns=await send('Do you have hot dog bread?',7);
    assert.equal(await hotDogBuns.locator('.product-row').count(),1);
    assert.match(await hotDogBuns.innerText(),/Hot Dog Bread/i);
    await frame.locator('#question').fill('what types of chicken do you have');await frame.locator('.send').click();
    const chickenTypes=frame.locator('.message.assistant .bubble').filter({hasText:'Raw breast / fillet'}).last();
    await chickenTypes.waitFor({timeout:20000});await frame.locator('.send:enabled').waitFor({timeout:20000});
    assert.match(await chickenTypes.innerText(),/Raw chicken.*Whole chicken.*Raw breast \/ fillet.*Raw legs.*Raw wings/s);
    assert.doesNotMatch(await chickenTypes.innerText(),/Meat & Chicken/);
    const raw=await send('i want raw chicken',8);assert.equal(await raw.locator('.product-row').count(),7);
    const rawCut=await send('what raw chicken cuts do you have',9);assert.equal(await rawCut.locator('.product-row').count(),7);
    for(const card of [raw,rawCut]){
      assert.match(await card.innerText(),/Fresh whole fillet poule dor 1kg/i);
      assert.match(await card.innerText(),/Whole fillet 500g/i);assert.match(await card.innerText(),/Whole fillet 900g/i);
      assert.doesNotMatch(await card.innerText(),/Escalope|Fajita|Red Sauce|Crispy/i);
    }
    const allChicken=await send('list for me all the chicken that you have',10);
    assert.match(await allChicken.locator('.card-intro').innerText(),/Showing 24 of 73/);
    while(await allChicken.locator('.card-more').count())await allChicken.locator('.card-more').click();
    assert.equal(await allChicken.locator('.product-row').count(),73);
    assert.match(await allChicken.innerText(),/Whole fillet 500g/i);assert.match(await allChicken.innerText(),/Whole fillet 900g/i);
    const fillet=await send('chicken fillet ?',11);assert.equal(await fillet.locator('.product-row').count(),3);
    assert.match(await fillet.innerText(),/Fresh whole fillet poule dor 1kg/i);assert.match(await fillet.innerText(),/Whole fillet 500g/i);assert.match(await fillet.innerText(),/Whole fillet 900g/i);assert.doesNotMatch(await fillet.innerText(),/Crispy|Escalope/i);
    assert.ok(histories[1].some(message=>message.role==='assistant'&&message.content.startsWith('{"kind":"types"')));
    for(const h of histories)for(const m of h)if(m.role==='assistant'&&m.content.startsWith('{'))assert.doesNotThrow(()=>JSON.parse(m.content.split('\n')[0]));
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}x${height}: type discovery, selected listing, paging, price, product identity, add-to-list and history`);
  }
}finally{globalThis.fetch=originalFetch;await browser.close();}
