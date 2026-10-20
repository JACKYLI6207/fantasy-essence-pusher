import {CoinPusher} from './physics.ts';
import {PlayerWallet} from './wallet.ts';
import {SlotMachine} from './slot.ts';
import {CONFIG} from './config.ts';

/** 雙機台：左右各一台 CoinPusher，共用金幣；各有獨立 SLOT。 */
export class DualCoinPusher {
  readonly left:CoinPusher;
  readonly right:CoinPusher;
  private nextSide:'left'|'right'='left';
  private auto=false;
  constructor(wallet:PlayerWallet) {
    this.left=new CoinPusher(undefined,undefined,wallet);
    this.right=new CoinPusher(undefined,undefined,wallet);
  }
  get gold(){return this.left.gold;}
  set gold(v:number){this.left.gold=v;}
  get dropped(){return this.left.dropped+this.right.dropped;}
  get won(){return this.left.won+this.right.won;}
  get recycled(){return this.left.recycled+this.right.recycled;}
  get coins(){return this.left.coins.length>=this.right.coins.length?this.left.coins:this.right.coins;}
  get coinCount(){return this.left.coins.length+this.right.coins.length;}
  get time(){return Math.max(this.left.time,this.right.time);}
  get lastDrop(){return Math.max(this.left.lastDrop,this.right.lastDrop);}
  get autoDrop(){return this.auto;}
  /** UI 用：優先顯示正在轉的 SLOT，否則左側。 */
  get slot():SlotMachine {
    if(this.left.slot.phase!=='idle'||this.left.slot.remaining>0||this.left.slot.queue>0)return this.left.slot;
    if(this.right.slot.phase!=='idle'||this.right.slot.remaining>0||this.right.slot.queue>0)return this.right.slot;
    return this.left.slot;
  }
  drop() {
    const prefer=this.nextSide==='left'?this.left:this.right;
    const other=prefer===this.left?this.right:this.left;
    if(prefer.drop()){this.nextSide=this.nextSide==='left'?'right':'left';return true;}
    if(other.drop()){this.nextSide=prefer===this.left?'left':'right';return true;}
    return false;
  }
  setAutoDrop(enabled:boolean) {
    this.auto=enabled&&this.gold>=CONFIG.essenceCost;
    this.left.autoDrop=false;this.right.autoDrop=false;
    if(this.auto)this.drop();
    return this.auto;
  }
  step(dt?:number) {
    this.left.autoDrop=false;this.right.autoDrop=false;
    this.left.step(dt);this.right.step(dt);
    if(this.auto){
      if(this.gold<CONFIG.essenceCost)this.auto=false;
      else this.drop();
    }
  }
  dispose() {
    this.auto=false;this.left.dispose();this.right.dispose();
  }
}

export type ActiveGame=CoinPusher|DualCoinPusher;
export function isDualGame(game:ActiveGame):game is DualCoinPusher {
  return game instanceof DualCoinPusher;
}
export function gameCoinCount(game:ActiveGame) {
  return isDualGame(game)?game.coinCount:game.coins.length;
}
export function gameCanDrop(game:ActiveGame) {
  if(game.gold<CONFIG.essenceCost)return false;
  if(game.time-game.lastDrop+1e-9<CONFIG.dropCooldown)return false;
  if(isDualGame(game))return game.left.coins.length<CONFIG.maxCoins||game.right.coins.length<CONFIG.maxCoins;
  return game.coins.length<CONFIG.maxCoins;
}
