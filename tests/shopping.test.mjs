import test from 'node:test';
import assert from 'node:assert/strict';
import { measurement, packQuantity, basketSummary, groupShoppingEntries } from '../public/shopping.js';

test('purchase quantities round up actual pack sizes and combine recipe needs',()=>{
  assert.equal(packQuantity({contributions:{a:'300 g',b:'300 g'}},{size:{en:'400g'}}),2);
  assert.equal(packQuantity({contributions:{a:'1 kg'}},{size:{en:'500g'}}),2);
  assert.equal(packQuantity({amount:'750 ml'},{size:{en:'0.5 L'}}),2);
  assert.equal(packQuantity({amount:'3 packs'}),3);
  assert.equal(packQuantity({amount:'12 pieces'},{size:{en:'6 pcs'}}),2);
  assert.equal(packQuantity({quantity:4,amount:'100 g'},{size:{en:'500g'}}),4);
  assert.equal(packQuantity({amount:'3 tbsp'},{size:{en:'200g'}}),1);
  assert.equal(packQuantity({amount:'500 ml'},{size:{en:'100g'}}),1,'No invented volume-to-weight conversions');
  assert.equal(measurement('٥٠٠ g').value,500);
});
test('totals use pack quantities and integer cents, exclude sold-out and flag missing prices',()=>{
  assert.deepEqual(basketSummary([
    {id:'a',quantity:3,price:0.1}, {id:'b',quantity:2,price:1.25},
    {id:'c',quantity:1,price:4,available:false}, {id:'d',amount:'1 pack',price:null},
  ]),{count:4,quantity:7,total:2.8,unpriced:1,unavailable:1});
});
test('shared ingredients appear once when grouped by recipe',()=>{
  const entries=[{id:'a',groups:{r1:{title:'Alfredo',kind:'recipe'},r2:{title:'Soup',kind:'recipe'}}},{id:'b',groups:{r1:{title:'Alfredo',kind:'recipe'}}},{id:'c'}];
  const groups=groupShoppingEntries(entries,'recipe');
  assert.deepEqual(groups.map(g=>g.label),['__shared','Alfredo','__other']);
  assert.equal(groups.flatMap(g=>g.items).length,3);
});
