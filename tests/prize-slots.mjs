import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {CoinPusher} from '../src/physics.ts';
import {PEGS,PRIZE_SLOTS} from '../src/config.ts';
await R.init();
assert.ok(PEGS.every(p=>p.y>2.6),'取消最後一排針柱');
assert.ok(PEGS.some(p=>p.x===0&&p.y<6),'龍頭下方必須有中央偏折針柱');
for(let i=0;i<7;i++) {
 const g=new CoinPusher(()=>.5);const x=-3.65+(i+.5)*7.3/7;
 g.dropX=x;g.drop();
 const player=g.coins.at(-1);
 player.body.setTranslation({x,y:2.03,z:.25},true);
 player.body.setLinvel({x:0,y:-1,z:0},true);
 for(let frame=0;frame<75;frame++)g.step();
 const expected=PRIZE_SLOTS[i]==='green'?2:PRIZE_SLOTS[i]==='gold'?1:0;
 assert.equal(g.bonusSpawned,expected,`第 ${i+1} 格補珠數`);
 const bonuses=g.coins.filter(c=>c.source==='bonus');
 assert.equal(bonuses.length,expected);
 for(const b of bonuses) {
   assert.equal(b.kind,PRIZE_SLOTS[i]);
   assert.equal(b.body.collider(0).radius(),b.kind==='gold'?.375:.25,'大金珠直徑為綠珠 1.5 倍');
 }
 if(PRIZE_SLOTS[i]==='green')assert.ok(g.lastGreenEject>0&&g.lastGoldEject<0);
 if(PRIZE_SLOTS[i]==='gold')assert.ok(g.lastGoldEject>0&&g.lastGreenEject<0);
 for(let frame=0;frame<1800;frame++)g.step();
 assert.equal(g.bonusSpawned,expected,'補珠不得再次觸發獎勵');
 assert.ok(g.coins.filter(c=>c.source==='bonus').every(c=>c.entered),'大金珠必須可通過中央針板與獎勵格進入珠床');
 g.reset();assert.equal(g.pendingBonuses.length,0);assert.equal(g.bonusSpawned,0);g.world.free();
}
console.log('七格獎勵驗證通過：無獎勵、兩顆綠珠、一顆大金珠、尺寸、出珠口、防連鎖與重置。');



