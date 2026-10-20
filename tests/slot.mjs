import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {SlotMachine,SLOT_REWARDS,selectSlotPrize,REEL_STOPS} from '../src/slot.ts';
import {CoinPusher} from '../src/physics.ts';
import {CONFIG} from '../src/config.ts';
const counts=Array(9).fill(0);
for(let i=0;i<1000;i++)counts[selectSlotPrize((i+.5)/1000)]++;
assert.deepEqual(counts,SLOT_REWARDS.map(p=>p.weight));
assert.equal(SLOT_REWARDS.reduce((n,p)=>n+p.amount*p.weight,0)/1000,23.7);
for(let index=0;index<9;index++) {
 const start=SLOT_REWARDS.slice(0,index).reduce((n,p)=>n+p.weight,0);
 const s=new SlotMachine(()=>(start+.5)/1000);s.trigger();s.trigger();
 assert.equal(s.update(0),0);assert.equal(s.phase,'spinning');
 assert.equal(s.update(REEL_STOPS[2]-.01),0);assert.equal(s.update(REEL_STOPS[2]),SLOT_REWARDS[index].amount);
 assert.equal(s.update(10),0,'同次旋轉不能重複配獎');assert.equal(s.spins,1,'未派完不得開始下一轉');
 s.remaining=0;s.update(11);s.update(11.1);assert.equal(s.spins,2,'多顆金珠必須排隊轉');
 s.reset();assert.equal(s.remaining,0);assert.equal(s.queue,0);assert.equal(s.phase,'idle');
}
await R.init();
for(const [x,kind,triggers] of [[0,'gold',1],[2.8,'gold',0],[-2.8,'gold',0],[0,'green',0]]) {
 const g=new CoinPusher();
 if(kind==='gold') {g.pendingBonuses.push({kind:'gold',due:0});g.step();}
 const bead=kind==='gold'?g.coins.at(-1):g.coins[0];
 bead.entered=true;bead.body.setEnabledTranslations(true,true,true,true);bead.body.setTranslation({x,y:-1.9,z:7.1},true);
 for(let i=0;i<5;i++)g.step();assert.equal(g.slot.spins,triggers,'僅中央入箱金珠可啟動 SLOT');g.world.free();
}
const g=new CoinPusher();g.slot=new SlotMachine(()=>.9999);g.slot.trigger();
const oldLimit=CONFIG.maxCoins;CONFIG.maxCoins=0;
for(let f=0;f<230;f++)g.step();
assert.equal(g.slot.awarded,300);assert.equal(g.slot.remaining,300);assert.equal(g.pendingBonuses.filter(b=>b.slotPayout).length,300,'滿台保留全部派珠');
CONFIG.maxCoins=oldLimit;
const baseline=g.bonusSpawned;
for(let f=0;f<4000&&g.slot.remaining>0;f++) {
 // Drain the receiving bed to isolate payout delivery and capacity bookkeeping.
 for(const c of g.coins)g.world.removeRigidBody(c.body);g.coins=[];
 g.step();
}
assert.equal(g.slot.remaining,0);assert.equal(g.bonusSpawned-baseline,300,'300 顆必須完整逐顆出珠');
assert.equal(g.slot.awarded,300);g.reset();assert.equal(g.pendingBonuses.length,0);assert.equal(g.slot.spins,0);g.world.free();
console.log('SLOT 驗證通過：九獎項權重、平均23.7、金珠中央觸發、側邊不觸發、旋轉排隊、滿台保留、300顆完整派送、重置。');
