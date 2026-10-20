import {CoinPusher,type ActiveGame} from './physics.ts';
import {getMachine,MACHINES,type MachineId} from './machines.ts';
import {PlayerWallet} from './wallet.ts';

export type {ActiveGame};

export class ArcadeSession {
  game:ActiveGame|null=null;
  machineId:MachineId|null=null;
  leaveRequested=false;
  readonly wallet:PlayerWallet;
  constructor(wallet:PlayerWallet){this.wallet=wallet;}
  enter(id:MachineId) {
    if(this.game||!MACHINES.some(m=>m.id===id))return false;
    const machine=getMachine(id);
    this.game=machine.layout==='dual'
      ? new CoinPusher(undefined,undefined,this.wallet,{widthScale:2,dualSlots:true})
      : new CoinPusher(undefined,undefined,this.wallet);
    this.machineId=id;
    return true;
  }
  requestLeave(){if(!this.game)return false;this.leaveRequested=true;return true;}
  cancelLeave(){this.leaveRequested=false;}
  confirmLeave() {
    if(!this.game||!this.leaveRequested)return false;
    this.game.dispose();this.game=null;this.machineId=null;this.leaveRequested=false;return true;
  }
  step(dt?:number){if(this.game&&!this.leaveRequested)this.game.step(dt);}
}
