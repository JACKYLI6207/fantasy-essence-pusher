import {CoinPusher} from './physics.ts';
import {MACHINES,type MachineId} from './machines.ts';
import {PlayerWallet} from './wallet.ts';
export class ArcadeSession {
  game:CoinPusher|null=null;
  machineId:MachineId|null=null;
  leaveRequested=false;
  readonly wallet:PlayerWallet;
  constructor(wallet:PlayerWallet){this.wallet=wallet;}
  enter(id:MachineId) {
    if(this.game||!MACHINES.some(m=>m.id===id))return false;
    this.game=new CoinPusher(undefined,undefined,this.wallet);this.machineId=id;return true;
  }
  requestLeave(){if(!this.game)return false;this.leaveRequested=true;return true;}
  cancelLeave(){this.leaveRequested=false;}
  confirmLeave() {
    if(!this.game||!this.leaveRequested)return false;
    this.game.dispose();this.game=null;this.machineId=null;this.leaveRequested=false;return true;
  }
  step(){if(this.game&&!this.leaveRequested)this.game.step();}
}
