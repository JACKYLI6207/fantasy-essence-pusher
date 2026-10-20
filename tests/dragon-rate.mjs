import assert from 'node:assert/strict';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';import {PEGS,SPLITTER,prizeSlotIndex} from '../src/config.ts';await R.init();
// Every centre-lane hit must pay, with no secondary random rejection.
for(let i=0;i<30;i++){
 const g=new CoinPusher(()=>i/30);g.dropX=0;g.drop();const b=g.coins.at(-1);b.body.setTranslation({x:0,y:2.03,z:.25},true);b.body.setLinvel({x:0,y:-1,z:0},true);
 for(let f=0;f<30;f++)g.step();assert.equal(g.bonusSpawned,1,'命中龍珠格必須出一顆龍珠');g.world.free();
}
const inner=PEGS.filter(p=>p.y===3.95&&Math.abs(p.x)===1.2);
assert.equal(inner.length,2);const results=[];
for(const distance of [1.35,1.2]){
 for(const p of inner)p.x=Math.sign(p.x)*distance;
 let seed=73191,stuck=0;const counts=Array(7).fill(0);
 for(let i=0;i<3500;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=-3.15+(i+seed/4294967296)/3500*6.3;
  const g=new CoinPusher();for(const c of g.coins)g.world.removeRigidBody(c.body);g.coins=[];g.dropX=x;g.drop();const b=g.coins.at(-1);let passed=false;
  for(let f=0;f<1200;f++){g.step();if(b.slotChecked){counts[prizeSlotIndex(b.body.translation().x)]++;passed=true;break;}}
  if(!passed)stuck++;g.world.free();
 }
 assert.equal(stuck,0);assert.ok(counts.every(n=>n>0));results.push(counts);
}
const ratio=results[1][3]/results[0][3];assert.ok(Math.abs(ratio-2/3)<.04,'僅透過針柱位置將龍珠格命中比例調為原本約2/3');
assert.equal(SPLITTER.scale,1.6);
console.log(JSON.stringify({before:results[0],after:results[1],dragonRatio:ratio,allHitsPay:true}));
