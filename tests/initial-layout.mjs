import assert from 'node:assert/strict';import {createInitialLayout} from '../src/initial-layout.ts';import {CONFIG,SPLITTER} from '../src/config.ts';
assert.equal(createInitialLayout(()=>0).length,65);assert.equal(createInitialLayout(()=>1).length,86);
let seed=7391;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const layouts=new Set(),counts=new Set();
for(let run=0;run<100;run++){
 const layout=createInitialLayout(random);assert.ok(layout.length>=65&&layout.length<=86);counts.add(layout.length);layouts.add(JSON.stringify(layout));
 for(let i=0;i<layout.length;i++){
  const a=layout[i];assert.ok(Math.abs(a.x)<3.4&&a.z>=2.3&&a.z<=6.71);
  assert.ok(Math.abs(a.x-SPLITTER.x)>SPLITTER.halfWidth+CONFIG.radius||Math.abs(a.z-SPLITTER.z)>SPLITTER.halfDepth+CONFIG.radius+.02);
  for(let j=i+1;j<layout.length;j++){const b=layout[j];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=CONFIG.radius*2,'初始精華不得重疊');}
 }
}
assert.ok(counts.size>=18&&layouts.size===100,'數量與位置都必須隨機');console.log('初始盤面驗證通過：65～86顆、100組隨機佈置、無重疊、避開分珠柱。');
