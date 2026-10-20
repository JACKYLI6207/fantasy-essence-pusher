import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { CoinPusher } from '../src/physics.ts';
import { classifyFrontExit } from '../src/config.ts';
for(const x of [-3.65,-2.8,-1.825,1.825,2.8,3.65]) assert.equal(classifyFrontExit(x),'recycle');
for(const x of [-1.824,0,1.824]) assert.equal(classifyFrontExit(x),'reward');
await RAPIER.init();
const game=new CoinPusher();
assert.equal(game.coins.length,108);
assert.equal(game.coins[0].body.collider(0).shapeType(),RAPIER.ShapeType.Ball,'綠珠必須使用球體碰撞');
assert.equal(game.drop(),true);
assert.equal(game.drop(),false,'投幣冷卻必須阻擋連發');
let minX=10,maxX=-10,minPush=10,maxPush=-10;
for(let frame=0;frame<3600;frame++) {
  if(frame%30===0 && frame<1800) game.drop();
  game.step();
  minX=Math.min(minX,game.dropX);maxX=Math.max(maxX,game.dropX);
  minPush=Math.min(minPush,game.pushZ);maxPush=Math.max(maxPush,game.pushZ);
  for(const coin of game.coins) {
    const p=coin.body.translation();assert.ok(Number.isFinite(p.x+p.y+p.z),'硬幣座標必須有效');
  }
}
assert.ok(minX< -3 && maxX>3,'出幣口應左右移動');
assert.ok(maxPush-minPush>1,'推板必須往復');
assert.equal(game.transferred,game.dropped,'停止投幣 30 秒後，不得有硬幣卡在針柱或側牆');
const shelf=game.pusher.collider(0).halfExtents();
assert.ok(shelf.x>=3.75 && shelf.z>=2.5,'平台必須覆蓋全寬並延伸至機台內');
assert.ok(game.pusher.translation().z-shelf.z<0,'平台後緣始終藏在機台內');
const trapped=game.coins.filter(c=>{const p=c.body.translation();return c.entered && p.z<game.pushZ-.3 && p.y<.5;});
assert.equal(trapped.length,0,'不得有硬幣落進推幣台後方的深色死角');
assert.ok(game.won>0,'持續投幣後，前方應有硬幣掉落');
assert.equal(game.coins.length+game.won+game.recycled,108+game.dropped+game.bonusSpawned,'金幣只能留在機台或從前方回收，不能從左右消失');
console.log(JSON.stringify({dropped:game.dropped,transferred:game.transferred,won:game.won,remaining:game.coins.length}));
game.reset();assert.equal(game.dropped,0);assert.equal(game.won,0);assert.equal(game.coins.length,108);
assert.equal(game.coins[0].body.collider(0).shapeType(),RAPIER.ShapeType.Ball,'綠珠必須使用球體碰撞');
for(const [index,sign] of [[0,-1],[1,1]]) {
  const coin=game.coins[index];
  coin.body.setTranslation({x:sign*3.35,y:.28,z:5.5},true);
  coin.body.applyImpulse({x:sign*.08,y:0,z:0},true);
}
for(let frame=0;frame<120;frame++) game.step();
for(const coin of game.coins.slice(0,2)) {
  const p=coin.body.translation();
  assert.ok(Math.abs(p.x)<3.65 && p.y>-.1,'硬幣受到側向推力時仍必須被可見側牆擋住');
}
game.reset();
const edgeCoin=game.coins[0];
edgeCoin.body.setTranslation({x:0,y:.28,z:7.1},true);
edgeCoin.body.setLinvel({x:0,y:0,z:.1},true);
for(let frame=0;frame<18;frame++) game.step();
assert.ok(game.coins.includes(edgeCoin) && edgeCoin.body.translation().y<0,'越過前緣後必須保留落下過程');
assert.equal(game.won,0,'硬幣尚在落下途中時不能提早回收');
for(let frame=0;frame<60;frame++) game.step();
assert.ok(!game.coins.includes(edgeCoin) && game.won>=1,'完整落下後才計數回收');
game.reset();
const rubber=game.coins[0];
for(const other of game.coins.slice(1)) game.world.removeRigidBody(other.body);
game.coins=[rubber];
rubber.body.setTranslation({x:0,y:.28,z:4.5},true);
rubber.body.applyImpulse({x:.04,y:0,z:0},true);
for(let frame=0;frame<120;frame++) game.step();
assert.ok(Math.abs(rubber.body.translation().x)<.4,'橡膠珠受輕推後滑行距離應短於自身直徑');
assert.ok(Math.abs(rubber.body.linvel().x)<.03,'橡膠珠應迅速停止滑動');
game.reset();
for(const [index,x] of [[0,-2.8],[1,0],[2,2.8]]) {
  game.coins[index].body.setTranslation({x,y:.28,z:7.1},true);
  game.coins[index].body.setLinvel({x:0,y:0,z:.1},true);
}
for(let frame=0;frame<90;frame++) game.step();
assert.equal(game.won,1,'中央掉落的一顆珠子計入玩家獎勵');
assert.equal(game.recycled,2,'左右各一顆珠子只能系統回收');
assert.ok(game.lastRewardTime>0,'中央入箱必須觸發寶石亮光時間');
assert.equal(game.coins.length+game.won+game.recycled,108,'回收與獎勵都只能結算一次');
game.reset();assert.equal(game.recycled,0,'重置也應清除系統回收數');
assert.equal(game.lastRewardTime,-1000,'重置時寶石應恢復未點亮');
for(const [index,x] of [[0,-2.8],[1,2.8]]) {
  game.coins[index].body.setTranslation({x,y:.28,z:7.1},true);
}
for(let frame=0;frame<90;frame++) game.step();
assert.equal(game.recycled,2);
assert.equal(game.won,0,'左右落底不應增加獎勵');
assert.equal(game.lastRewardTime,-1000,'左右回收不應點亮寶箱寶石');
game.world.free();console.log('物理整合驗證通過：60 秒模擬、側牆、止滑、中央獎勵、兩側回收、分界與重置。');





