import assert from 'node:assert/strict';
import R from '@dimforge/rapier3d-compat';
import {CoinPusher} from '../src/physics.ts';
import {PEGS} from '../src/config.ts';
await R.init();
const middle=PEGS.filter(p=>p.y===5.1),lower=PEGS.filter(p=>p.y===3.95);
assert.ok(middle.every(a=>lower.every(b=>Math.abs(a.x-b.x)>.5)),'龍頭下方兩排應錯開半格，不得上下對齊');
const maxDiameter=.75,margin=.08,pinRadius=.105;
for(let i=0;i<PEGS.length;i++) {
 const a=PEGS[i];
 assert.ok(3.68-Math.abs(a.x)-(a.radius ?? pinRadius)>=(a.y>6.15?.5:maxDiameter)+margin,'側牆與針柱間應留足金珠通道');
 for(let j=i+1;j<PEGS.length;j++) {
  const b=PEGS[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)-(a.radius ?? pinRadius)-(b.radius ?? pinRadius)>=(Math.min(a.y,b.y)>6.15?.5:maxDiameter)+margin,'相鄰針柱不得形成金珠夾點');
 }
 const gateTop=2.85;
 assert.ok(a.y-(a.radius ?? pinRadius)-gateTop>=maxDiameter+margin,'最下排與格口頂端應留足空間');
}
let greenPassed=0,goldPassed=0;
for(let i=0;i<=30;i++) {
 const g=new CoinPusher();g.dropX=-3.15+i*6.3/30;g.drop();const bead=g.coins.at(-1);
 for(let f=0;f<1800 && !bead.entered;f++)g.step();
 assert.ok(bead.entered,`綠珠投放位置 ${i} 未通過針板`);greenPassed++;g.world.free();
}
for(const offset of [-.18,-.09,0,.09,.18]) {
 const g=new CoinPusher();g.pendingBonuses.push({kind:'gold',due:0});g.step();const bead=g.coins.at(-1);
 bead.body.setTranslation({x:offset,y:6.15,z:.32},true);
 for(let f=0;f<1800 && !bead.entered;f++)g.step();
 assert.ok(bead.entered,`金珠偏移 ${offset} 未通過針板`);goldPassed++;g.world.free();
}
console.log(`針陣驗證通過：${greenPassed} 個綠珠投放位置、${goldPassed} 個金珠落點，全部通過；上段依綠珠、下段依金珠驗證針柱與側牆、格口間隙。`);



