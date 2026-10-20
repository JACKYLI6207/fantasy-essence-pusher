import RAPIER from '@dimforge/rapier3d-compat';
import { SlotMachine } from './slot.ts';
import {createInitialLayout} from './initial-layout.ts';
import {PlayerWallet} from './wallet.ts';
import { CONFIG, PEGS, OUTLETS, SPLITTER, PRIZE_SLOTS, prizeSlotIndex, classifyFrontExit, type ExitZone } from './config.ts';

export type Coin = { body: RAPIER.RigidBody; entered: boolean; age: number; lowestY: number; stalledFor: number; exitZone: ExitZone | null; kind:'green'|'gold'; source:'player'|'bonus'|'bed'; slotChecked:boolean };
export class CoinPusher {
  world!: RAPIER.World;
  pusher!: RAPIER.RigidBody;
  coins: Coin[] = [];
  initialCount=0;
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
  lastRewardTime = -1000;
  lastDrop = -1000;
  dropX = 0;
  pushZ = 0;
  speed = 0.9;
  transferred = 0;
  bonusSpawned = 0;
  pendingBonuses: {kind:'green'|'gold'; due:number; slotPayout?:boolean}[] = [];
  slot = new SlotMachine();
  slotLights = Array(7).fill(-1000) as number[];
  lastGreenEject = -1000;
  lastLeftEject = -1000;
  lastRightEject = -1000;
  nextEssenceSide:'left'|'right'='left';
  lastGoldEject = -1000;
  outletColliders: RAPIER.Collider[] = [];
  splitterCollider!:RAPIER.Collider;
  private launchRandom:()=>number;
  private layoutRandom:()=>number;
  constructor(launchRandom:()=>number=Math.random,layoutRandom:()=>number=Math.random,wallet?:PlayerWallet) {
    this.wallet=wallet??new PlayerWallet();this.ownsWallet=!wallet;
    this.launchRandom=launchRandom;this.layoutRandom=layoutRandom;this.reset();
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
  reset() {
    this.world?.free();
    this.world=new RAPIER.World({x:0,y:-15,z:0});
    this.world.timestep=CONFIG.fixedStep;
    this.coins=[];this.time=0;this.dropped=0;this.won=0;this.recycled=0;this.lastRewardTime=-1000;this.lastDrop=-1000;this.transferred=0;this.dropX=0;this.pushZ=1.5;
    this.bonusSpawned=0;this.pendingBonuses=[];this.slotLights=Array(7).fill(-1000);this.lastGreenEject=-1000;this.lastGoldEject=-1000;
    this.lastLeftEject=-1000;this.lastRightEject=-1000;this.nextEssenceSide='left';
    this.outletColliders=[];
    if(this.ownsWallet)this.gold=CONFIG.startingGold;
    this.earnedGold=0;this.autoDrop=false;
    this.slot.reset();
    this.box(0,-.22,3.15,3.65,.22,3.65);
    const points:number[]=[];
    for(const y of [0,SPLITTER.height])for(const [x,z] of [[0,-SPLITTER.halfDepth],[-SPLITTER.halfWidth,SPLITTER.halfDepth],[SPLITTER.halfWidth,SPLITTER.halfDepth]])points.push(x,y,z);
    this.splitterCollider=this.world.createCollider(RAPIER.ColliderDesc.convexHull(new Float32Array(points))!
      .setTranslation(SPLITTER.x,0,SPLITTER.z).setFriction(.05).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(.08));
    this.box(0,5,-.18,3.8,5,.08);
    // Front guide ends above the horizontal bed to leave a transfer opening.
    this.box(-2.35,5.7,.85,1.45,4.3,.08);this.box(2.35,5.7,.85,1.45,4.3,.08);
    for(let i=1;i<7;i++) this.box(-3.65+i*(7.3/7),2.45,.3,.035,.4,.45);
    this.box(-3.8,5,.2,.12,5,.5);this.box(3.8,5,.2,.12,5,.5);
    // Match the visibly closed side rails for the full bed and front chute.
    // Their inner face meets the floor edge, leaving no hidden side gutter.
    this.box(-3.77,.5,3.5,.12,2.5,4.2);this.box(3.77,.5,3.5,.12,2.5,4.2);
    for(const peg of PEGS) {
      const shape=RAPIER.ColliderDesc.cylinder(.32,peg.radius ?? .105)
        .setRotation({x:Math.SQRT1_2,y:0,z:0,w:Math.SQRT1_2});
      this.world.createCollider(shape.setTranslation(peg.x,peg.y,.25)
        .setFriction(.025).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(.28));
    }
    // Sculpted head crown and cheeks are solid; the lower central mouth stays
    // open. Spawn points sit outside the solids, never inside a collider.
    const dragon=OUTLETS.dragon;
    this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.ball(.5).setTranslation(dragon.x,dragon.y+.2,dragon.z)));
    for(const x of [-.43,.43]) this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.ball(.23).setTranslation(x,dragon.y-.2,dragon.z)));
    for(const pipe of [OUTLETS.leftPipe,OUTLETS.pipe]) {
      this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.cuboid(.28,.17,.3).setTranslation(pipe.x,pipe.y+.4,pipe.z)));
      this.outletColliders.push(this.world.createCollider(RAPIER.ColliderDesc.cuboid(.28,.12,.3).setTranslation(pipe.x,pipe.y-.4,pipe.z)));
    }
    // Solid full-width upper shelf extends behind the cabinet, never leaving
    // an unreachable strip of lower floor behind a detached moving bar.
    this.pusher=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.35,this.pushZ-2.5));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(3.78,.35,2.5).setFriction(.5),this.pusher);
    const layout=createInitialLayout(this.layoutRandom);this.initialCount=layout.length;
    for(const p of layout)this.makeCoin(p.x,p.y,p.z);
  }
  drop() {
    if(this.gold<CONFIG.essenceCost) {this.autoDrop=false;return false;}
    if(this.time-this.lastDrop+1e-9<CONFIG.dropCooldown || this.coins.length>=CONFIG.maxCoins) return false;
    this.lastDrop=this.time;
    this.makeCoin(this.dropX,9.55,.25,true,'green','player');
    this.gold-=CONFIG.essenceCost;
    if(this.gold<CONFIG.essenceCost)this.autoDrop=false;
    this.dropped++;
    return true;
  }
  setAutoDrop(enabled:boolean) {
    this.autoDrop=enabled&&this.gold>=CONFIG.essenceCost;
    if(this.autoDrop)this.drop();
    return this.autoDrop;
  }
  dispose() {
    this.autoDrop=false;this.pendingBonuses=[];this.slot.reset();this.coins=[];
    this.world.free();
  }
  step(dt=CONFIG.fixedStep) {
    const stepDt=Math.max(1/240,dt);
    this.world.timestep=stepDt;
    this.time+=stepDt;
    this.dropX=Math.sin(this.time*this.speed)*3.15;
    if(this.autoDrop)this.drop();
    this.pushZ=1.5+(1-Math.cos(this.time*CONFIG.pusherAngularSpeed))*.58;
    this.pusher.setNextKinematicTranslation({x:0,y:.35,z:this.pushZ-2.5});
    this.world.step();
    this.coins=this.coins.filter(coin=> {
      coin.age+=stepDt;
      const p=coin.body.translation();
      if(!coin.slotChecked && p.y<2.05) {
        coin.slotChecked=true;
        const slot=prizeSlotIndex(p.x),prize=PRIZE_SLOTS[slot];
        this.slotLights[slot]=this.time;
        if(prize==='green') {
          this.pendingBonuses.push({kind:'green',due:this.time+.15},{kind:'green',due:this.time+.15});
        } else if(prize==='gold') this.pendingBonuses.push({kind:'gold',due:this.time+.2});
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
        // Round pegs can balance a centre-on ball. Release stalled contacts
        // with a small board vibration, scaled by mass for the larger dragon orb.
        if(p.y<coin.lowestY-.08) { coin.lowestY=p.y;coin.stalledFor=0; }
        else coin.stalledFor+=stepDt;
        if(coin.stalledFor>.35) {
          const direction=Math.sin(this.time*2.7+coin.body.handle*17)>=0?1:-1;
          const mass=coin.body.mass();
          coin.body.applyImpulse({x:direction*mass*.9,y:-mass*.08,z:0},true);
          coin.stalledFor=0;
        }
      }
      // Lock the lane when the bead leaves the shelf. Lateral motion during
      // the visible fall must not turn a recovery bead into a reward.
      if(coin.entered && coin.exitZone===null && p.y<0 && p.z>6.65) coin.exitZone=classifyFrontExit(p.x);
      const collectionY=coin.exitZone==='recycle'?-6.1:-1.8;
      if(p.y<collectionY || (!coin.entered && coin.age>180)) {
        // Only coins that fell off the front count. Stale cleanup never awards coins.
        if(p.y<collectionY && coin.exitZone!==null) {
          if(coin.exitZone==='reward') {
            this.won++;this.lastRewardTime=this.time;
            if(coin.kind==='gold')this.slot.trigger();
            else {this.gold+=CONFIG.essenceReturnGold;this.earnedGold+=CONFIG.essenceReturnGold;}
          }
          else this.recycled++;
        }
        this.world.removeRigidBody(coin.body);
        return false;
      }
      return true;
    });
    const payout=this.slot.update(this.time);
    for(let i=0;i<payout;i++)this.pendingBonuses.push({kind:'green',due:this.time,slotPayout:true});
    // Spawn after filtering so new beads cannot be lost when the active array
    // is replaced. Capacity delays earned prizes instead of discarding them.
    const pending:typeof this.pendingBonuses=[];
    for(const bonus of this.pendingBonuses) {
      if(bonus.due>this.time || this.coins.length>=CONFIG.maxCoins || (bonus.kind==='green' && this.time-this.lastGreenEject<CONFIG.essenceEjectInterval)) {pending.push(bonus);continue;}
      if(bonus.kind==='green') {
        const left=this.nextEssenceSide==='left';
        const spawn=left?OUTLETS.leftGreenSpawn:OUTLETS.greenSpawn;
        const body=this.makeCoin(spawn.x,spawn.y,spawn.z,false,'green','bonus');
        const strength=1+Math.min(1,Math.max(0,this.launchRandom()));
        body.setLinvel({x:(left?1:-1)*3.2*strength,y:.25,z:.15},true);this.lastGreenEject=this.time;
        if(left)this.lastLeftEject=this.time;else this.lastRightEject=this.time;
        this.nextEssenceSide=left?'right':'left';
      } else {
        const spawn=OUTLETS.goldSpawn;
        this.makeCoin(spawn.x,spawn.y,spawn.z,true,'gold','bonus');this.lastGoldEject=this.time;
      }
      this.bonusSpawned++;
      if(bonus.slotPayout)this.slot.remaining--;
    }
    this.pendingBonuses=pending;
  }
}








