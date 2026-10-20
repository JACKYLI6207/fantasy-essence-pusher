import assert from 'node:assert/strict';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';await R.init();
for(const kind of ['green','gold'])for(const x of [-2.8,0,2.8]){
 const g=new CoinPusher(()=>.5,()=>.5);for(const c of g.coins)g.world.removeRigidBody(c.body);g.coins=[];
 g.pendingBonuses.push({kind,due:0});g.step();const b=g.coins[0];b.entered=true;b.body.setEnabledTranslations(true,true,true,true);
 b.body.setTranslation({x,y:-1.9,z:7.1},true);b.body.setLinvel({x:0,y:0,z:0},true);g.gold=0;
 for(let i=0;i<90;i++)g.step();const expected=kind==='green'&&x===0?1:0;
 assert.equal(g.gold,expected,'只有中央入箱精華換回金幣');assert.equal(g.earnedGold,expected);assert.equal(g.slot.spins,kind==='gold'&&x===0?1:0,'龍珠保持SLOT獎勵，不直接換幣');
 for(let i=0;i<30;i++)g.step();assert.equal(g.earnedGold,expected,'同一顆精華不可重複返幣');
 if(expected){assert.equal(g.drop(),true,'零餘額玩家收到精華返幣後可繼續投放');assert.equal(g.gold,0);}
 g.world.free();
}
const g=new CoinPusher(()=>.5,()=>.5);const b=g.coins[0];for(const c of g.coins.slice(1))g.world.removeRigidBody(c.body);g.coins=[b];g.gold=0;
b.body.setTranslation({x:0,y:-.1,z:7.1},true);g.step();assert.equal(g.gold,0,'仍在落下途中不應提前返幣');
for(let i=0;i<90;i++)g.step();assert.equal(g.gold,1,'初始盤面的精華入箱亦應返幣');
g.reset();assert.equal(g.gold,1000);assert.equal(g.earnedGold,0);g.world.free();
console.log('精華返幣驗證通過：1比1入帳、左右不返幣、龍珠維持SLOT、不重複計算、初始及獎勵精華皆可返幣、零餘額恢復投入。');
