import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';import {prizeSlotIndex} from '../src/config.ts';await R.init();
const n=700,counts=Array(7).fill(0);let stuck=0,deflected=0;let seed=73191;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<n;i++) {
 const g=new CoinPusher();for(const c of g.coins)g.world.removeRigidBody(c.body);g.coins=[];
 const x=-3.15+(i+random())/n*6.3;g.dropX=x;g.drop();const bead=g.coins.at(-1);let crossed=false,maxShift=0;
 for(let f=0;f<1200;f++) {g.step();const p=bead.body.translation();maxShift=Math.max(maxShift,Math.abs(p.x-x));if(bead.slotChecked){counts[prizeSlotIndex(p.x)]++;crossed=true;break;}}
 if(!crossed)stuck++;if(maxShift>.4)deflected++;g.world.free();
}

assert.equal(stuck,0,'全部測試珠都必須通過針板');
assert.ok(counts.every(c=>c>0),'七個獎勵格都必須實際通過');
assert.ok(deflected/n>=.9,'至少九成投放應出現明顯橫向偏折');
assert.ok(counts[3]/n<=.1,'均勻投放下金珠觸發比例應不超過一成');
assert.ok(counts[1]>counts[3]&&counts[5]>counts[3],'金珠應比兩側綠珠獎勵少見');
console.log(JSON.stringify({n,counts,stuck,deflected,goldRate:counts[3]/n}));


