import assert from 'node:assert/strict';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';await R.init();
const landings=[];
for(const unit of [0,.25,.5,.75,1]) {
 const g=new CoinPusher(()=>unit);for(const c of g.coins)g.world.removeRigidBody(c.body);g.coins=[];
 g.pendingBonuses.push({kind:'green',due:0});g.step();const bead=g.coins.at(-1);
 assert.ok(Math.abs(Math.abs(bead.body.linvel().x)-3.2*(1+unit))<.00001,'噴射初速必須介於原本1至2倍');
 let landed=false;
 for(let f=0;f<120;f++){g.step();const p=bead.body.translation();if(p.y<=.28){landings.push(p.x);landed=true;break;}}
 assert.ok(landed);g.world.free();
}
assert.ok(Math.max(...landings)-Math.min(...landings)>.8,'噴射力道必須形成不同落點');
console.log('出珠力道驗證通過：1至2倍五種力道，落點x='+landings.map(n=>n.toFixed(2)).join(', '));

