import RAPIER from '@dimforge/rapier3d-compat';
import { SlotMachine } from './slot.ts';
import {createInitialLayout} from './initial-layout.ts';
import {PlayerWallet} from './wallet.ts';
import { CONFIG, PEGS, OUTLETS, SPLITTER, PRIZE_SLOTS, TWIN_LANE, TWIN_DRAGON_LEFT, TWIN_DRAGON_RIGHT, FRONT_EXIT, SPIN_BARS, prizeSlotIndex, classifyFrontExit, classifyTwinFrontExit, twinPrizeSlotIndex, twinDragonX, type ExitZone } from './config.ts';

export type Coin = { body: RAPIER.RigidBody; entered: boolean; age: number; lowestY: number; stalledFor: number; exitZone: ExitZone | null; kind:'green'|'gold'; source:'player'|'bonus'|'bed'; slotChecked:boolean };
export type CoinPusherOptions = {
  widthScale?: number;
  dualSlots?: boolean;
  /** 下層接珠機：無玩家移動出幣口 */
  receiveOnly?: boolean;
  /** 僅中央一個龍頭（下層堆疊用） */
  centerDecor?: boolean;
  /** 左右回收時改交給下層，不計入本機 recycled */
  onRecycle?: (kind:'green'|'gold', x:number)=>void;
};
export type ActiveGame = CoinPusher;

export class CoinPusher {
  world!: RAPIER.World;
  pusher!: RAPIER.RigidBody;
  coins: Coin[] = [];
  initialCount=0;
  /** 1 = 原機；2 = 雙球道連體機 */
  readonly widthScale:number;
  readonly dualSlots:boolean;
  readonly twinTracks:boolean;
  readonly receiveOnly:boolean;
  readonly centerDecor:boolean;
  readonly halfWidth:number;
  readonly rewardHalfWidth:number;
  readonly dropAmp:number;
  private onRecycle?:CoinPusherOptions['onRecycle'];
  get maxCoins(){return Math.round(CONFIG.maxCoins*(this.widthScale>1?1.5:1));}
  private wallet:PlayerWallet;
  private ownsWallet:boolean;
  get gold(){return this.wallet.gold;}
  set gold(value:number){this.wallet.setBalance(value);}
  earnedGold=0;
  autoDrop=false;
  time = 0;
  dropped = 0;
  won = 0;
  recycled = 0;
  /** 回收轉交下層的次數（堆疊機用） */
  cascaded = 0;
  lastRewardTime = -1000;
  lastDrop = -1000;
  dropX = 0;
  dropXLeft = 0;
  dropXRight = 0;
  activeDropLane:'left'|'right'='left';
  pushZ = 0;
  speed = 0.9;
  transferred = 0;
  bonusSpawned = 0;
  pendingBonuses: {kind:'green'|'gold'; due:number; slotPayout?:boolean; slotId?:0|1; lane?:'left'|'right'}[] = [];
  slot = new SlotMachine();
  slotB = new SlotMachine();
  slotLights = Array(14).fill(-1000) as number[];
  lastGreenEject = -1000;
  lastLeftEject = -1000;
  lastRightEject = -1000;
  nextEssenceSide:'left'|'right'='left';
  lastGoldEject = -1000;
  lastGoldEjectLane:'left'|'right'='left';
  outletColliders: RAPIER.Collider[] = [];
  splitterCollider!:RAPIER.Collider;
  /** 下層左右旋轉橫槓（kinematic） */
  spinnerBodies: RAPIER.RigidBody[] = [];
  get spinnerAngle(){return this.centerDecor?this.time*SPIN_BARS.angularSpeed:0;}
  private launchRandom:()=>number;
  private layoutRandom:()=>number;
  constructor(launchRandom:()=>number=Math.random,layoutRandom:()=>number=Math.random,wallet?:PlayerWallet,opts:CoinPusherOptions={}) {
    this.widthScale=opts.widthScale??1;
    this.twinTracks=this.widthScale>1;
    this.dualSlots=opts.dualSlots??this.twinTracks;
    this.receiveOnly=!!opts.receiveOnly;
    this.centerDecor=!!opts.centerDecor;
    this.onRecycle=opts.onRecycle;
    // 雙機幣床要比兩道並排再外擴，才能填滿拉伸機櫃左右視覺區（紅框空角）
    this.halfWidth=this.twinTracks?TWIN_LANE+FRONT_EXIT.halfWidth+1.35:FRONT_EXIT.halfWidth;
    this.rewardHalfWidth=FRONT_EXIT.rewardHalfWidth;
    // 接珠層不摆動；其餘出幣口行程跟著幣床半寬
    this.dropAmp=this.receiveOnly?0:3.15*(this.halfWidth/FRONT_EXIT.halfWidth);
    this.wallet=wallet??new PlayerWallet();this.ownsWallet=!wallet;
    this.launchRandom=launchRandom;this.layoutRandom=layoutRandom;this.reset();
  }
  /** 上層左右坑掉落的珠，從本機頂部落入針陣；滿台時回傳 false */
  acceptCascade(kind:'green'|'gold', x:number) {
    if(this.coins.length>=this.maxCoins)return false;
    const cx=Math.max(-this.halfWidth+.4,Math.min(this.halfWidth-.4,x));
    this.makeCoin(cx,9.55,.25,true,kind,'bonus');
    // bonus 預設跳過判定；接珠必須走下層七格／金球判定
    this.coins[this.coins.length-1].slotChecked=false;
    return true;
  }

  private box(x:number,y:number,z:number,hx:number,hy:number,hz:number) {
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z).setFriction(.8));
  }
  private makeCoin(x:number,y:number,z:number,upper=false,kind:'green'|'gold'='green',source:Coin['source']='bed') {
    const desc=RAPIER.RigidBodyDesc.dynamic().setTranslation(x,y,z).setLinearDamping(upper ? .15 : 1.8).setAngularDamping(upper ? .6 : 8).setCcdEnabled(true);
    const body=this.world.createRigidBody(desc);
    this.world.createCollider(RAPIER.ColliderDesc.ball(CONFIG.radius*(kind==='gold'?1.5:1)).setDensity(1).setFriction(.95).setRestitution(.025),body);
    if(upper) { body.setEnabledTranslations(true,true,false,true); body.setEnabledRotations(false,false,true,true); }
    this.coins.push({body,entered:!upper,age:0,lowestY:y,stalledFor:0,exitZone:null,kind,source,slotChecked:!upper || source!=='player'});
    return body;
  }
  private addDragon(cx:number) {
    const d=OUTLETS.dragon;
    this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.ball(.5).setTranslation(cx,d.y+.2,d.z)));
    for(const ox of [-.43,.43]) this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.ball(.23).setTranslation(cx+ox,d.y-.2,d.z)));
  }
  private addSpinBars() {
    if(!this.centerDecor)return;
    this.spinnerBodies=[];
    for(const sign of [-1,1] as const){
      const body=this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(sign*SPIN_BARS.x,SPIN_BARS.y,SPIN_BARS.z)
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(SPIN_BARS.halfLength,SPIN_BARS.halfThick,SPIN_BARS.halfDepth)
          .setFriction(.04).setRestitution(.42)
          .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min),
        body
      );
      this.spinnerBodies.push(body);
    }
  }
  private addTrack(cx:number, dragonX:number|null=cx) {
    // 與單機相同淨寬：綠珠(r=0.25)／金球(r=0.375)皆可過針陣與七格
    this.box(cx-2.35,5.7,.85,1.45,4.3,.08);this.box(cx+2.35,5.7,.85,1.45,4.3,.08);
    for(let i=1;i<7;i++) this.box(cx-3.65+i*(7.3/7),2.45,.3,.035,.4,.45);
    for(const peg of PEGS) {
      const shape=RAPIER.ColliderDesc.cylinder(.32,peg.radius ?? .105)
        .setRotation({x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2});
      this.world.createCollider(shape.setTranslation(cx+peg.x,peg.y,.25)
        .setFriction(.025).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(.28));
    }
    if(dragonX!==null)this.addDragon(dragonX);
    for(const pipe of [OUTLETS.leftPipe,OUTLETS.pipe]) {
      const px=cx+pipe.x;
      this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.cuboid(.28,.17,.3).setTranslation(px,pipe.y+.4,pipe.z)));
      this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.cuboid(.28,.12,.3).setTranslation(px,pipe.y-.4,pipe.z)));
    }
  }
  reset() {
    const hw=this.halfWidth;
    this.world?.free();
    this.world=new RAPIER.World({x:0,y:-15,z:0});
    this.world.timestep=CONFIG.fixedStep;
    this.coins=[];this.time=0;this.dropped=0;this.won=0;this.recycled=0;this.cascaded=0;this.lastRewardTime=-1000;this.lastDrop=-1000;this.transferred=0;
    this.dropX=0;this.dropXLeft=-TWIN_LANE;this.dropXRight=TWIN_LANE;this.activeDropLane='left';this.pushZ=1.5;
    this.bonusSpawned=0;this.pendingBonuses=[];this.slotLights=Array(14).fill(-1000);this.lastGreenEject=-1000;this.lastGoldEject=-1000;
    this.lastLeftEject=-1000;this.lastRightEject=-1000;this.nextEssenceSide='left';this.lastGoldEjectLane='left';
    this.outletColliders=[];this.spinnerBodies=[];
    if(this.ownsWallet)this.gold=CONFIG.startingGold;
    this.earnedGold=0;this.autoDrop=false;
    this.slot.reset();this.slotB.reset();
    // 下方共用幣池（維持兩倍寬）
    this.box(0,-.22,3.15,hw,.22,3.65);
    const points:number[]=[];
    for(const y of [0,SPLITTER.height])for(const [x,z] of [[0,-SPLITTER.halfDepth],[-SPLITTER.halfWidth,SPLITTER.halfDepth],[SPLITTER.halfWidth,SPLITTER.halfDepth]])points.push(x,y,z);
    this.splitterCollider=this.world.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(points))!
      .setTranslation(SPLITTER.x,0,SPLITTER.z).setFriction(.05).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(.08));
    this.box(0,5,-.18,hw+.15,5,.08);
    this.box(-hw-.15,5,.2,.12,5,.5);this.box(hw+.15,5,.2,.12,5,.5);
    this.box(-hw-.12,.5,3.5,.12,2.5,4.2);this.box(hw+.12,.5,3.5,.12,2.5,4.2);
    if(this.twinTracks){
      if(this.centerDecor){
        this.addTrack(-TWIN_LANE,null);
        this.addTrack(TWIN_LANE,null);
        this.addDragon(0);
        this.addSpinBars();
      }else{
        this.addTrack(-TWIN_LANE,TWIN_DRAGON_LEFT);
        this.addTrack(TWIN_LANE,TWIN_DRAGON_RIGHT);
      }
    }else{
      this.addTrack(0);
    }
    this.pusher=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.35,this.pushZ-2.5));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(hw+.13,.35,2.5).setFriction(.5),this.pusher);
    const layout=createInitialLayout(this.layoutRandom,this.widthScale,this.halfWidth);this.initialCount=layout.length;
    for(const p of layout)this.makeCoin(p.x,p.y,p.z);
  }
  drop() {
    if(this.receiveOnly)return false;
    if(this.gold<CONFIG.essenceCost) {this.autoDrop=false;return false;}
    if(this.time-this.lastDrop+1e-9<CONFIG.dropCooldown || this.coins.length>=this.maxCoins) return false;
    this.lastDrop=this.time;
    this.makeCoin(this.dropX,9.55,.25,true,'green','player');
    this.gold-=CONFIG.essenceCost;
    if(this.gold<CONFIG.essenceCost)this.autoDrop=false;
    this.dropped++;
    return true;
  }
  setAutoDrop(enabled:boolean) {
    if(this.receiveOnly){this.autoDrop=false;return false;}
    this.autoDrop=enabled&&this.gold>=CONFIG.essenceCost;
    if(this.autoDrop)this.drop();
    return this.autoDrop;
  }
  dispose() {
    this.autoDrop=false;this.pendingBonuses=[];this.slot.reset();this.slotB.reset();this.coins=[];
    this.world.free();
  }
  step(dt=CONFIG.fixedStep) {
    const stepDt=Math.max(1/240,dt);
    this.world.timestep=stepDt;
    this.time+=stepDt;
    // 雙命運殿上方綠幣出幣口也只留一個（中央來回）
    this.dropX=Math.sin(this.time*this.speed)*this.dropAmp;
    if(this.autoDrop)this.drop();
    this.pushZ=1.5+(1-Math.cos(this.time*CONFIG.pusherAngularSpeed))*.58;
    this.pusher.setNextKinematicTranslation({x:0,y:.35,z:this.pushZ-2.5});
    // 左右橫槓鏡像旋轉（對齊對稱）
    if(this.spinnerBodies.length){
      const a=this.spinnerAngle,half=a*.5,s=Math.sin(half),c=Math.cos(half);
      for(let i=0;i<this.spinnerBodies.length;i++){
        const z=i===0?s:-s;
        this.spinnerBodies[i].setNextKinematicRotation({x:0,y:0,z,w:c});
      }
    }
    this.world.step();
    this.coins=this.coins.filter(coin=> {
      coin.age+=stepDt;
      const p=coin.body.translation();
      if(!coin.slotChecked && p.y<2.05) {
        coin.slotChecked=true;
        const local=this.twinTracks?twinPrizeSlotIndex(p.x):prizeSlotIndex(p.x);
        const prize=PRIZE_SLOTS[local];
        const light=this.twinTracks?(p.x<0?local:local+7):local;
        this.slotLights[light]=this.time;
        const lane: 'left'|'right'=p.x<0?'left':'right';
        if(prize==='green') {
          this.pendingBonuses.push({kind:'green',due:this.time+.15,lane},{kind:'green',due:this.time+.15,lane});
        } else if(prize==='gold') this.pendingBonuses.push({kind:'gold',due:this.time+.2,lane});
      }
      if(!coin.entered && p.y<1.45) {
        coin.entered=true;if(coin.source==='player') this.transferred++;
        coin.body.setLinearDamping(1.8);
        coin.body.setAngularDamping(8);
        coin.body.setEnabledTranslations(true,true,true,true);
        coin.body.setEnabledRotations(true,true,true,true);
        coin.body.applyImpulse({x:0,y:0,z:.045},true);
      }
      if(!coin.entered) {
        if(p.y<coin.lowestY-.08) { coin.lowestY=p.y;coin.stalledFor=0; }
        else coin.stalledFor+=stepDt;
        if(coin.stalledFor>.35) {
          const direction=Math.sin(this.time*2.7+coin.body.handle*17)>=0?1:-1;
          const mass=coin.body.mass();
          coin.body.applyImpulse({x:direction*mass*.9,y:-mass*.08,z:0},true);
          coin.stalledFor=0;
        }
      }
      if(coin.entered && coin.exitZone===null && p.y<0 && p.z>6.65) {
        coin.exitZone=this.twinTracks?classifyTwinFrontExit(p.x,this.halfWidth):classifyFrontExit(p.x);
      }
      const collectionY=coin.exitZone==='recycle'?-6.1:-1.8;
      if(p.y<collectionY || (!coin.entered && coin.age>180)) {
        if(p.y<collectionY && coin.exitZone!==null) {
          if(coin.exitZone==='reward') {
            this.won++;this.lastRewardTime=this.time;
            if(coin.kind==='gold'){
              if(this.dualSlots)(p.x<0?this.slot:this.slotB).trigger();
              else this.slot.trigger();
            }
            else {this.gold+=CONFIG.essenceReturnGold;this.earnedGold+=CONFIG.essenceReturnGold;}
          }
          else if(this.onRecycle){this.onRecycle(coin.kind,p.x);this.cascaded++;}
          else this.recycled++;
        }
        this.world.removeRigidBody(coin.body);
        return false;
      }
      return true;
    });
    const payoutA=this.slot.update(this.time);
    const payoutB=this.dualSlots?this.slotB.update(this.time):0;
    for(let i=0;i<payoutA;i++)this.pendingBonuses.push({kind:'green',due:this.time,slotPayout:true,slotId:0,lane:'left'});
    for(let i=0;i<payoutB;i++)this.pendingBonuses.push({kind:'green',due:this.time,slotPayout:true,slotId:1,lane:'right'});
    const pending:typeof this.pendingBonuses=[];
    for(const bonus of this.pendingBonuses) {
      if(bonus.due>this.time || this.coins.length>=this.maxCoins || (bonus.kind==='green' && this.time-this.lastGreenEject<CONFIG.essenceEjectInterval)) {pending.push(bonus);continue;}
      const laneCenter=this.twinTracks?(bonus.lane==='right'?TWIN_LANE:bonus.lane==='left'?-TWIN_LANE:0):0;
      if(bonus.kind==='green') {
        const left=this.nextEssenceSide==='left';
        const local=left?OUTLETS.leftGreenSpawn:OUTLETS.greenSpawn;
        const body=this.makeCoin(laneCenter+local.x,local.y,local.z,false,'green','bonus');
        const strength=1+Math.min(1,Math.max(0,this.launchRandom()));
        body.setLinvel({x:(left?1:-1)*3.2*strength,y:.25,z:.15},true);this.lastGreenEject=this.time;
        if(left)this.lastLeftEject=this.time;else this.lastRightEject=this.time;
        this.nextEssenceSide=left?'right':'left';
      } else {
        const dragonX=this.centerDecor?0:this.twinTracks?twinDragonX(bonus.lane):0;
        this.makeCoin(dragonX+OUTLETS.goldSpawn.x,OUTLETS.goldSpawn.y,OUTLETS.goldSpawn.z,true,'gold','bonus');
        this.lastGoldEject=this.time;
        this.lastGoldEjectLane=this.centerDecor?'left':bonus.lane==='right'?'right':'left';
      }
      this.bonusSpawned++;
      if(bonus.slotPayout){
        const target=bonus.slotId===1?this.slotB:this.slot;
        target.remaining--;
      }
    }
    this.pendingBonuses=pending;
  }
}
