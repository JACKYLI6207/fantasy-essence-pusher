import type {SlotMachine} from './slot.ts';
export function rewardTier(amount:number):'none'|'normal'|'jackpot' {
  return amount>=100?'jackpot':amount>0?'normal':'none';
}
export function celebration(slot:SlotMachine,time:number,reduced=false) {
  const tier=rewardTier(slot.lastAmount),age=time-slot.resultTime;
  const duration=tier==='jackpot'?3.2:1.6;
  if(tier==='none'||age<0||age>=duration)return {tier:'none' as const,intensity:0};
  const envelope=Math.sin(Math.PI*Math.min(1,age/duration));
  const pulse=reduced?1:.65+.35*Math.cos(age*Math.PI*4);
  return {tier,intensity:envelope*pulse*(reduced?.25:1)};
}
export function marqueeMessage(slot:SlotMachine) {
  if(slot.phase==='spinning')return '龍珠喚醒命運 · SLOT 轉動中…';
  if(slot.lastAmount>0)return `${slot.lastAmount>=100?'大獎降臨！':'恭喜中獎！'}獲得 ${slot.lastAmount} 精華${slot.remaining>0?` · 派送中，尚餘 ${slot.remaining}`:''}`;
  return '秘境金庫 · 龍珠入寶箱，喚醒命運 SLOT';
}

