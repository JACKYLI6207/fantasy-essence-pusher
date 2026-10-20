export const SLOT_REWARDS = [
  {symbol:'翠葉',amount:10,weight:300},
  {symbol:'藥水',amount:15,weight:240},
  {symbol:'水晶',amount:20,weight:180},
  {symbol:'盾牌',amount:30,weight:120},
  {symbol:'寶劍',amount:40,weight:80},
  {symbol:'卷軸',amount:50,weight:50},
  {symbol:'寶箱',amount:100,weight:20},
  {symbol:'王冠',amount:200,weight:8},
  {symbol:'金龍',amount:300,weight:2},
] as const;
export const REEL_STOPS=[2,2.7,3.4] as const;
export function selectSlotPrize(unit:number) {
  let ticket=Math.min(.999999999,Math.max(0,unit))*1000;
  for(let i=0;i<SLOT_REWARDS.length;i++) {ticket-=SLOT_REWARDS[i].weight;if(ticket<0)return i;}
  return 8;
}
export class SlotMachine {
  queue=0;
  phase:'idle'|'spinning'|'result'='idle';
  startTime=-1000;
  prizeIndex=0;
  spins=0;
  awarded=0;
  remaining=0;
  resultTime=-1000;
  lastAmount=0;
  private random:()=>number;
  constructor(random:()=>number=Math.random) {this.random=random;}
  trigger() {this.queue++;}
  reset() {this.queue=0;this.phase='idle';this.startTime=-1000;this.prizeIndex=0;this.spins=0;this.awarded=0;this.remaining=0;this.resultTime=-1000;this.lastAmount=0;}
  update(time:number) {
    if(this.phase==='idle'&&this.queue>0) {
      this.queue--;this.phase='spinning';this.startTime=time;this.prizeIndex=selectSlotPrize(this.random());this.spins++;
    }
    if(this.phase==='spinning'&&time-this.startTime>=REEL_STOPS[2]) {
      this.phase='result';const amount=SLOT_REWARDS[this.prizeIndex].amount;
      this.resultTime=time;this.lastAmount=amount;
      this.awarded+=amount;this.remaining+=amount;return amount;
    }
    if(this.phase==='result'&&time-this.startTime>=4.9&&this.remaining===0)this.phase='idle';
    return 0;
  }
}

