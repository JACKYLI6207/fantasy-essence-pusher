import assert from 'node:assert/strict';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';import {SPLITTER} from '../src/config.ts';
await R.init();const g=new CoinPusher(()=>.5);for(let i=0;i<300;i++)g.pendingBonuses.push({kind:'green',due:0});
const times=[];let previous=-1000;
for(let f=0;f<1900&&g.pendingBonuses.length>0;f++){g.step();if(g.lastGreenEject!==previous&&g.lastGreenEject>0){previous=g.lastGreenEject;times.push(previous);}}
assert.equal(times.length,300,'最大獎項應完整噴出300顆');
let maxGap=0;for(let i=1;i<times.length;i++)maxGap=Math.max(maxGap,times[i]-times[i-1]);
assert.ok(maxGap<.1,`派珠途中不應分批停頓，最大間隔 ${maxGap}`);assert.ok(times.at(-1)-times[0]<26,'300顆應於26秒內連續噴完');g.world.free();
for(const sign of [-1,1]) {
 const t=new CoinPusher();const b=t.coins[0];for(const c of t.coins.slice(1))t.world.removeRigidBody(c.body);t.coins=[b];
 b.body.setTranslation({x:sign*.1,y:.27,z:SPLITTER.z-.7},true);b.body.setLinvel({x:0,y:0,z:3},true);
 // Keep a forward drive to simulate pressure from the pusher and bead pile.
 for(let f=0;f<90;f++){b.body.applyImpulse({x:0,y:0,z:.001},true);t.step();}
 assert.ok(Math.sign(b.body.translation().x)===sign&&Math.abs(b.body.translation().x)>.3,'分珠柱應把精華偏向左右');t.world.free();
}
console.log(`連續出珠與分珠柱驗證通過：300顆連續派送 ${(times.at(-1)-times[0]).toFixed(2)} 秒、最大間隔 ${maxGap.toFixed(3)} 秒，三角柱左右碰撞均有效。`);
