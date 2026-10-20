import assert from 'node:assert/strict';import fs from 'node:fs';import R from '@dimforge/rapier3d-compat';import {CoinPusher} from '../src/physics.ts';import {CONFIG} from '../src/config.ts';await R.init();
const g=new CoinPusher();const accepted=[];
for(let f=0;f<120;f++){if(g.drop())accepted.push(g.time);g.step();}
assert.equal(accepted.length,4,'連點2秒最多投放4顆');for(let i=1;i<accepted.length;i++)assert.ok(accepted[i]-accepted[i-1]>=.5-1e-9,'相鄰投放不得短於0.5秒');
assert.equal(CONFIG.pusherAngularSpeed,1.35*1.2);
assert.ok(Math.abs(g.pushZ-(1.5+(1-Math.cos(g.time*1.62))*.58))<1e-9,'推板頻率應為原本1.2倍');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(!/id="(?:reset|speed)"/.test(html),'玩家介面不得提供重置與出幣口速度調整');g.world.free();
console.log('操作限制驗證通過：投放最多2顆/s、推板1.2倍速度、移除速度調整與重置控制。');
