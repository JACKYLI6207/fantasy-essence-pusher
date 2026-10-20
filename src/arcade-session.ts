import {CoinPusher} from './physics.ts';
import {DualCoinPusher,type ActiveGame} from './dual-pusher.ts';
import {getMachine,MACHINES,type MachineId} from './machines.ts';
import {PlayerWallet} from './wallet.ts';

export class ArcadeSession {
  game:ActiveGame|null=null;
  machineId:MachineId|null=null;
  leaveRequested=false;
  readonly wallet:PlayerWallet;
  constructor(wallet:PlayerWallet){this.wallet=wallet;}
  enter(id:MachineId) {
    if(this.game||!MACHINES.some(m=>m.id===id))return false;
    const machine=getMachine(id);
    this.game=machine.layout==='dual'?new DualCoinPusher(this.wallet):new CoinPusher(undefined,undefined,this.wallet);
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
