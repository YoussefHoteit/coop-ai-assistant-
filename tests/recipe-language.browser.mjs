import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(process.env.TASK_MODULES?path.join(process.env.TASK_MODULES,'package.json'):import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE&&{executablePath:process.env.BROWSER_EXE})});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const product={id:'159464',name:{en:'E&V cooking cream 20cl',ar:'E&V cooking cream 20cl'},size:{en:'20cl',ar:'20cl'},price:3.6,available:true,category:'dairy',sourceKind:'catalog'};
const cases=[
  {language:'en',rowLanguage:'en',question:'Give me a cream recipe',title:'Cream sauce',step:'Heat the cream gently.',name:'E&V cooking cream',amount:'400 ml',status:'Available'},
  {language:'ar',rowLanguage:'ar',question:'بدي وصفة بالكريما',title:'صلصة الكريمة',step:'سخّن الكريمة على نار هادئة.',name:'كريمة الطبخ إيل وفير',amount:'٤٠٠ مل',status:'متوفر'},
  {language:'arz',rowLanguage:'en',question:'baddi wasfe bel krime',title:'Wasfet el krime',step:'Sakhin el krime 3a nar hadye.',name:'E&V cooking cream',amount:'400 ml',status:'Available'},
  {language:'fr',rowLanguage:'fr',question:'Donnez-moi une recette à la crème',title:'Sauce à la crème',step:'Faites chauffer la crème doucement.',name:'Crème de cuisson Elle & Vire',amount:'400 ml',status:'Disponible'},
];
try{
  for(const [width,height] of [[390,844],[1440,900]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<600,isMobile:width<600});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**/*',route=>route.abort());
    await page.route('**/api/chat',async route=>{
      const body=route.request().postDataJSON();const c=cases.find(candidate=>candidate.question===body.message);
      await route.fulfill({json:{text:'',mode:'ai',language:c.language,products:[product],card:{kind:'recipe',title:c.title,steps:[c.step],servings:4,minutes:10,items:[{id:product.id,name:c.name,amount:c.amount,purchaseAmount:'400 ml',grams:null}]}}});
    });
    await page.goto(base+'/');await page.locator('al-makhazen-assistant-widget button').click();
    const frame=page.frameLocator('al-makhazen-assistant-widget iframe');await frame.locator('.welcome').waitFor();
    for(const c of cases){
      await frame.locator('#question').fill(c.question);await frame.locator('.send').click();
      const card=frame.locator('.result-card').last();await card.locator('.card-intro h3').filter({hasText:c.title}).waitFor();
      const row=card.locator('.product-row');assert.equal(await row.getAttribute('lang'),c.rowLanguage);assert.equal(await row.getAttribute('dir'),c.rowLanguage==='ar'?'rtl':'ltr');
      assert.equal(await row.locator('strong').innerText(),c.name);
      const details=await row.locator('.copyable-text').innerText();assert.ok(details.includes(c.amount),details);
      if(c.language==='ar')assert.doesNotMatch(details,/\p{Script=Latin}/u);
      else assert.ok(details.includes(c.status),details);
      if(c.language==='arz')assert.doesNotMatch(details,/mawjoud|3elbe|7abbe|mal3a2a/i);
      await card.locator('.steps summary').click();assert.equal(await card.locator('.steps li').innerText(),c.step);
      await card.locator('.primary').click();
      const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('makhazen-list-v1')));
      assert.equal(stored[0].displayNames[c.rowLanguage],c.name);
      assert.equal(Object.values(stored[0].purchaseContributions).at(-1),'400 ml');
      await frame.locator('#reset').click();await frame.locator('.welcome').waitFor();
    }
    assert.deepEqual(errors,[]);console.log('PASS ingredient rows, steps, prices and shared list localization',width,height);await page.close();
  }
}finally{await browser.close();}
