import assert from 'node:assert/strict';import {SlotMachine,SLOT_REWARDS} from '../src/slot.ts';import {rewardTier,celebration,marqueeMessage} from '../src/celebration.ts';
assert.equal(rewardTier(0),'none');for(const n of [10,15,20,30,40,50,99])assert.equal(rewardTier(n),'normal');for(const n of [100,200,300])assert.equal(rewardTier(n),'jackpot','100 必須包含在大獎門檻');
for(let i=0;i<SLOT_REWARDS.length;i++){
 const start=SLOT_REWARDS.slice(0,i).reduce((sum,p)=>sum+p.weight,0);const s=new SlotMachine(()=>(start+.5)/1000);s.trigger();s.update(0);
 assert.match(marqueeMessage(s),/轉動中/);assert.equal(celebration(s,3).tier,'none','開獎前不得提前顯示燈效');
 s.update(3.4);const fx=celebration(s,3.9);assert.equal(fx.tier,SLOT_REWARDS[i].amount>=100?'jackpot':'normal');assert.ok(fx.intensity>0);
 assert.match(marqueeMessage(s),new RegExp(`獲得 ${SLOT_REWARDS[i].amount} 精華`));
 assert.ok(celebration(s,3.9,true).intensity<=.25,'減少動態設定應降低燈效');assert.equal(celebration(s,7).tier,'none','燈效必須自動結束');
 s.reset();assert.equal(s.lastAmount,0);assert.equal(celebration(s,8).tier,'none');assert.match(marqueeMessage(s),/龍珠/);
}
console.log('跑馬燈與燈效驗證通過：精華／龍珠命名、九種結果訊息、100含以上大獎、正常小獎、燈效結束、重置。');
