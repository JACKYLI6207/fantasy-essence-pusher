import assert from 'node:assert/strict';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';import {CONFIG} from '../src/config.ts';await R.init();
const g=new CoinPusher(()=>.5);for(let i=0;i<6;i++)g.pendingBonuses.push({kind:'green',due:0});
const sequence=[];let previous=-1000;
for(let f=0;f<120;f++) {
 g.step();if(g.lastGreenEject!==previous&&g.lastGreenEject>=0){
  if(previous>=0)assert.ok(g.lastGreenEject-previous>=CONFIG.essenceEjectInterval-1e-6,'左右必須錯開噴射');
  previous=g.lastGreenEject;const b=g.coins.at(-1),p=b.body.translation(),v=b.body.linvel();
  sequence.push(p.x<0?'left':'right');assert.ok(p.x*v.x<0,'兩側都應朝中央噴射');assert.ok(Math.abs(v.x)>=3.2&&Math.abs(v.x)<=6.4);
 }
}
assert.deepEqual(sequence,['left','right','left','right','left','right']);
g.reset();g.pendingBonuses.push({kind:'green',due:0});const limit=CONFIG.maxCoins;CONFIG.maxCoins=0;g.step();assert.equal(g.nextEssenceSide,'left','滿台等待不能跳過左側');CONFIG.maxCoins=limit;g.step();assert.ok(g.lastLeftEject>0);assert.equal(g.nextEssenceSide,'right');g.world.free();
console.log('雙側精華出珠驗證通過：左右交替、間隔、朝中央、1～2倍力道、滿台等待與重置。');

