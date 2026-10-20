import {CoinPusher} from './physics.ts';
import {PlayerWallet} from './wallet.ts';

/** 雙命運殿上下堆疊：上層回收左右坑 → 下層接珠；下層無移動綠幣出幣口。 */
export class CascadePusher {
  readonly upper:CoinPusher;
  readonly lower:CoinPusher;
  readonly widthScale=2;
  readonly twinTracks=true;
  readonly dualSlots=true;
  readonly stacked=true as const;
  constructor(wallet?:PlayerWallet) {
    const shared=wallet??new PlayerWallet();
    this.lower=new CoinPusher(undefined,undefined,shared,{widthScale:2,dualSlots:true,receiveOnly:true});
    this.upper=new CoinPusher(undefined,undefined,shared,{
      widthScale:2,
      dualSlots:true,
      onRecycle:(kind,x)=>{
        if(!this.lower.acceptCascade(kind,x))this.lower.recycled++;
      },
    });
  }
  get gold(){return this.upper.gold;}
  set gold(v:number){this.upper.gold=v;}
  get dropped(){return this.upper.dropped;}
  get won(){return this.upper.won+this.lower.won;}
  get recycled(){return this.lower.recycled;}
  get cascaded(){return this.upper.cascaded;}
  get coins(){return this.upper.coins;}
  get maxCoins(){return this.upper.maxCoins;}
  get slot(){return this.upper.slot;}
  get slotB(){return this.upper.slotB;}
  get autoDrop(){return this.upper.autoDrop;}
  get time(){return this.upper.time;}
  get lastRewardTime(){
    return Math.max(this.upper.lastRewardTime,this.lower.lastRewardTime);
  }
  drop(){return this.upper.drop();}
  setAutoDrop(enabled:boolean){return this.upper.setAutoDrop(enabled);}
  step(dt?:number){this.upper.step(dt);this.lower.step(dt);}
  dispose(){this.upper.dispose();this.lower.dispose();}
}

export function isCascadeGame(game: object): game is CascadePusher {
  return 'stacked' in game && (game as CascadePusher).stacked===true;
}
