import assert from 'node:assert/strict';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';import {PEGS} from '../src/config.ts';
await R.init();let checked=0;
for(const kind of ['green','gold'])for(const peg of PEGS.filter(p=>kind==='green'||p.y<6.15)) {
 const g=new CoinPusher();for(const c of g.coins)g.world.removeRigidBody(c.body);g.coins=[];
 let bead;
 if(kind==='gold'){g.pendingBonuses.push({kind:'gold',due:0});g.step();bead=g.coins.at(-1);}
 else {g.drop();bead=g.coins.at(-1);}
 const r=kind==='gold'?.375:.25;
 bead.body.setTranslation({x:peg.x,y:peg.y+(peg.radius??.105)+r+.025,z:kind==='gold'?.32:.25},true);
 bead.body.setLinvel({x:0,y:0,z:0},true);
 // A centred contact on a round peg must be released by the anti-stall vibration.
 let released=false;
 for(let f=0;f<90;f++){g.step();if(bead.body.translation().y<peg.y-.1 || Math.abs(bead.body.translation().x-peg.x)>r+(peg.radius??.105)){released=true;break;}}
 assert.ok(released,`${kind} 正中針柱 ${peg.x},${peg.y} 必須在短時間內離開圓柱 ${JSON.stringify(bead.body.translation())}`);checked++;g.world.free();
}
const g=new CoinPusher();for(const c of g.coins)g.world.removeRigidBody(c.body);g.coins=[];
let goldPassed=0;const goldCreated=new Set();
for(let f=0;f<2400;f++) {
 if(f<1200&&f%20===0)g.drop();
 if(f<900&&f%30===0)g.pendingBonuses.push({kind:'gold',due:g.time});
 g.step();for(const c of g.coins)if(c.kind==='gold')goldCreated.add(c.body.handle);
 g.coins=g.coins.filter(c=>{if(c.entered){if(c.kind==='gold')goldPassed++;g.world.removeRigidBody(c.body);return false;}return true;});
}
assert.equal(g.transferred,g.dropped,'連續綠珠不得橋接卡住');assert.ok(goldPassed>=30);assert.equal(goldPassed,goldCreated.size,'所有生成的金珠均須通過針板');
g.world.free();console.log(`正中柱頂驗證通過 ${checked} 個珠型／針柱組合，圓柱接觸均在 1.5 秒內釋放。`);


