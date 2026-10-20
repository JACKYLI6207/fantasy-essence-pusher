import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {CoinPusher} from '../src/physics.ts';
import {OUTLETS} from '../src/config.ts';
await R.init();const g=new CoinPusher();
g.pendingBonuses.push({kind:'green',due:0});g.step();
const bead=g.coins.at(-1);assert.ok(bead.body.linvel().x>3,'左側管口應朝中央噴珠');
const startX=bead.body.translation().x;
for(let f=0;f<18;f++)g.step();assert.ok(bead.body.translation().x>startX+.5,'補珠應有可見的向中央移動');
g.reset();g.dropX=0;g.drop();const player=g.coins.at(-1);
player.body.setTranslation({x:0,y:8.5,z:.25},true);player.body.setLinvel({x:0,y:-4,z:0},true);
for(let f=0;f<20;f++)g.step();assert.ok(player.body.translation().y>8.1,'綠珠應撞到龍頭冠部，不得穿過');
assert.ok(g.outletColliders.length>=5,'龍頭及側向管口應有實體碰撞');
g.reset();g.pendingBonuses.push({kind:'gold',due:0});g.step();const gold=g.coins.at(-1);
assert.equal(gold.body.translation().y,Math.fround(OUTLETS.goldSpawn.y));
for(let f=0;f<1800;f++)g.step();assert.ok(gold.entered,'金珠應從龍嘴離開，通過偏折針柱後進入珠床');
g.world.free();console.log('出口驗證通過：右側向中央噴珠、龍頭實體碰撞、龍嘴出金珠與下方針柱通行。');

