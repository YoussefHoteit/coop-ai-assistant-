import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE})});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  const cream={id:'159464',name:{en:'E&V creme uht 35% 20cl',ar:'E&V creme uht 35% 20cl'},size:{en:'20cl',ar:'20cl'},category:'dairy',price:3.6,available:true,sourceKind:'catalog'};
  let calls=0;
  await page.route('**/api/chat',async route=>{
    const request=route.request().postDataJSON();
    const previous=request.history.findLast(message=>message.role==='assistant');
    const key=previous?JSON.parse(previous.content.split('\n')[0]).recipeKey:null;
    const count=++calls===1?2:3;
    await route.fulfill({json:{text:'',language:'fr',mode:'ai',products:[cream],card:{kind:'recipe',title:'Gratin',servings:count===2?4:6,minutes:30,revisesRecipe:key,steps:['Verser la crème.'],items:[{id:cream.id,name:'Crème',amount:count+' briques de 20 cl',purchaseAmount:count*200+' ml',grams:null}]}}});
  });
  await page.goto(base+'/');
  await page.locator('al-makhazen-assistant-widget button').click();
  const frame=page.frameLocator('al-makhazen-assistant-widget iframe');
  for(const [message,total,count] of [['Une recette pour quatre personnes','$7.20',2],['Pour six personnes','$10.80',3]]){
    await frame.locator('#question').fill(message);await frame.locator('.send').click();
    await frame.locator('.result-card').last().locator('.primary').click();
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('makhazen-list-v1')));
    assert.equal(saved.length,1);
    assert.equal(Object.values(saved[0].purchaseContributions)[0],count*200+' ml');
    await frame.locator('#list-toggle').click();
    await frame.locator('.list-item').waitFor();
    const amount=(await frame.locator('#list-total').innerText()).replace(/[^\d.,]/gu,'').replace(',','.');
    assert.equal(Number(amount),Number(total.slice(1)));
    assert.equal(await frame.locator('.quantity-stepper span').innerText(),String(count));
    await frame.locator('#continue-chat').click();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS French cartons, shared list total, and serving revision replacement');
}finally{await browser.close();}
