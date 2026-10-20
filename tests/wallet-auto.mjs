import assert from 'node:assert/strict';import fs from 'node:fs';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';import {CONFIG} from '../src/config.ts';await R.init();
const g=new CoinPusher(()=>.5,()=>.5);
assert.equal(g.gold,1000);assert.equal(g.autoDrop,false);assert.equal(CONFIG.essenceCost,1);
assert.equal(g.drop(),true);assert.equal(g.gold,999);assert.equal(g.drop(),false);assert.equal(g.gold,999,'冷卻拒絕投放不能扣金幣');
g.reset();const times=[];g.setAutoDrop(true);times.push(g.lastDrop);let previous=g.dropped;
for(let f=0;f<120;f++){g.drop();g.step();if(g.dropped>previous){times.push(g.lastDrop);previous=g.dropped;}}
assert.equal(g.dropped,5,'自動與手動共用上限，0到2秒含端點只投入5顆');assert.equal(g.gold,995);
for(let i=1;i<times.length;i++)assert.ok(Math.abs(times[i]-times[i-1]-.5)<1e-8,'自動投入應每0.5秒投一顆');
g.setAutoDrop(false);const stopped=g.dropped;for(let i=0;i<60;i++)g.step();assert.equal(g.dropped,stopped,'關閉後立即停止');
g.reset();g.gold=2;g.setAutoDrop(true);for(let i=0;i<120;i++)g.step();assert.equal(g.dropped,2);assert.equal(g.gold,0);assert.equal(g.autoDrop,false);assert.equal(g.setAutoDrop(true),false);assert.equal(g.drop(),false);assert.equal(g.gold,0,'餘額不得負數');
g.reset();const limit=CONFIG.maxCoins;CONFIG.maxCoins=0;g.setAutoDrop(true);for(let i=0;i<30;i++)g.step();assert.equal(g.gold,1000,'滿台等待不得扣錢');assert.equal(g.dropped,0);CONFIG.maxCoins=limit;g.step();assert.equal(g.gold,999,'恢復可投放時才扣錢');g.setAutoDrop(false);
g.pendingBonuses.push({kind:'green',due:g.time});g.step();assert.equal(g.gold,999,'獎勵派珠不扣玩家金幣');g.reset();assert.equal(g.gold,1000);assert.equal(g.autoDrop,false);g.world.free();
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(/<details class="adventure-details">/.test(html),'冒險區塊應預設收合');assert.ok(/id="gold-balance"/.test(html)&&/id="auto-drop"/.test(html));
console.log('錢包與自動投入驗證通過：初始1000、每顆1金幣、最高2顆/s、手自動共用限速、餘額不足停止、失敗不扣款、免費派獎與預設摺疊。');
