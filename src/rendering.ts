import { PEGS as pegs, FRONT_EXIT, PRIZE_SLOTS, OUTLETS, SPLITTER, TWIN_LANE, TWIN_DRAGON_LEFT, TWIN_DRAGON_RIGHT, SPIN_BARS, type PrizeKind } from './config.ts';
import type { CoinPusher } from './physics.ts';
import {isCascadeGame,isWideGame,type ActiveGame} from './dual-pusher.ts';
import {loadSlotArtwork,renderSlot,renderCabinetCelebration} from './slot-rendering.ts';

const canvas=document.getElementById('game') as HTMLCanvasElement;
const ctx=canvas.getContext('2d')!;

const machine=new Image(),atlas=new Image(),platform=new Image(),bead=new Image(),bay=new Image(),gold=new Image(),gates=new Image(),dragon=new Image(),pipe=new Image(),splitter=new Image();
machine.src=new URL('./assets/machine.png',document.baseURI).href;atlas.src=new URL('./assets/sprites.png',document.baseURI).href;platform.src=new URL('./assets/platform.png',document.baseURI).href;bead.src=new URL('./assets/green-bead.png',document.baseURI).href;bay.src=new URL('./assets/treasure-bay.png',document.baseURI).href;
gold.src=new URL('./assets/gold-bead.png',document.baseURI).href;gates.src=new URL('./assets/prize-gates.png',document.baseURI).href;dragon.src=new URL('./assets/dragon-outlet.png',document.baseURI).href;pipe.src=new URL('./assets/side-pipe.png',document.baseURI).href;
splitter.src=new URL('./assets/triangle-splitter.png',document.baseURI).href;

const WIDE_W=2048;
const CAB_H=1536;
/** 只裁下層頂部獅鷲橫幅（紅框），不影響上層收穫籃 */
const JOIN_CROP=300;
const STACK_H=CAB_H*2-JOIN_CROP;

export async function loadArtwork(){
 await Promise.all([machine.decode(),atlas.decode(),platform.decode(),bead.decode(),bay.decode(),gold.decode(),gates.decode(),dragon.decode(),pipe.decode(),splitter.decode(),loadSlotArtwork()]);
 setDisplayLayout(false);
}

export function setDisplayLayout(wide:boolean,stacked=false){
 const w=wide||stacked?WIDE_W:1024;
 const h=stacked?STACK_H:CAB_H;
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 const host=canvas.parentElement;
 if(host){
  host.classList.toggle('machine-dual',wide||stacked);
  host.classList.toggle('machine-stacked',stacked);
  host.style.aspectRatio=stacked?`${WIDE_W} / ${STACK_H}`:wide?`${WIDE_W} / ${CAB_H}`:'2 / 3';
 }
}

function project(x:number,y:number,z:number,cx=512){
 const t=Math.max(0,z)/7;
 return {x:cx+x*(z>0.8?83+25*t:87),y:835-y*48+z*51};
}
function sprite(kind:number,x:number,y:number,w:number,h:number,angle=0){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 const rects=[[50,110,540,530],[770,230,330,330],[20,710,520,400],[545,825,715,260]];
 const [sx,sy,sw,sh]=rects[kind];const scale=atlas.naturalWidth/1280;
 ctx.drawImage(atlas,sx*scale,sy*scale,sw*scale,sh*scale,-w/2,-h/2,w,h);ctx.restore();
}

function drawTrackGates(game:CoinPusher,lane:number,cx:number,lightBase:number,prizes:readonly PrizeKind[]=PRIZE_SLOTS){
 const gateLeft=project(lane-FRONT_EXIT.halfWidth,2.45,.25,cx).x;
 const gateRight=project(lane+FRONT_EXIT.halfWidth,2.45,.25,cx).x;
 const gateWidth=(gateRight-gateLeft)/7;
 for(let i=0;i<7;i++) {
   const x=gateLeft+i*gateWidth,gs=gates.naturalWidth/2048;
   const active=game.time-game.slotLights[lightBase+i]<.8;
   ctx.save();
   if(active) {ctx.shadowColor=prizes[i]==='gold'?'#ffcc55':'#7bffba';ctx.shadowBlur=18;}
   ctx.drawImage(gates,879*gs,160*gs,30*gs,365*gs,x-5,702,10,76);
   if(i===6)ctx.drawImage(gates,879*gs,160*gs,30*gs,365*gs,x+gateWidth-5,702,10,76);
   if(prizes[i]!=='none') {
     const art=prizes[i]==='gold'?gold:bead;
     const size=prizes[i]==='gold'?34:24;
     ctx.drawImage(art,x+gateWidth/2-size/2,764,size,size);
   }
   ctx.restore();
 }
}
function drawSpinBars(game:CoinPusher,cx:number){
 if(!game.spinnerBodies.length)return;
 const halfPx=SPIN_BARS.halfLength*87;
 const thick=Math.max(10,SPIN_BARS.halfThick*87*2);
 const angle=game.spinnerAngle;
 for(const body of game.spinnerBodies){
  const t=body.translation();
  const p=project(t.x,SPIN_BARS.y,SPIN_BARS.z,cx);
  // canvas 正角＝順時針：左逆時針、右順時針
  const spin=t.x<0?-angle:t.x>0?angle:angle;
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(spin);
  const g=ctx.createLinearGradient(0,-thick/2,0,thick/2);
  g.addColorStop(0,'#5a4420');g.addColorStop(.35,'#e8d090');g.addColorStop(.65,'#b8964e');g.addColorStop(1,'#3a2c14');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.roundRect(-halfPx,-thick/2,halfPx*2,thick,thick/2);ctx.fill();
  ctx.strokeStyle='rgba(255,230,160,0.55)';ctx.lineWidth=1.5;
  ctx.stroke();
  ctx.fillStyle='#1a1510';
  ctx.beginPath();ctx.arc(0,0,4.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#c2a764';
  ctx.beginPath();ctx.arc(0,0,2.2,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
}
function drawTrackDragon(game:CoinPusher,dragonX:number,cx:number,side:'left'|'right',pipeBase=dragonX){
 const goldOutlet=project(dragonX,OUTLETS.dragon.y,OUTLETS.dragon.z,cx);
 for(const [outlet,flip,last] of [[OUTLETS.leftPipe,true,game.lastLeftEject],[OUTLETS.pipe,false,game.lastRightEject]] as const) {
   const p=project(pipeBase+outlet.x,outlet.y,outlet.z,cx);ctx.save();ctx.translate(p.x,p.y);if(flip)ctx.scale(-1,1);
   if(game.time-last<.18){ctx.shadowColor='#7bffb5';ctx.shadowBlur=18;}
   ctx.drawImage(pipe,-62,-31,124,62);ctx.restore();
 }
 ctx.save();
 if(game.time-game.lastGoldEject<.4&&game.lastGoldEjectLane===side){ctx.shadowColor='#ffe58a';ctx.shadowBlur=18;}
 ctx.drawImage(dragon,goldOutlet.x-62,goldOutlet.y-53,124,106);ctx.restore();
}

function paintCabinet(game:CoinPusher,opts:{clear?:boolean;cropTop?:number}={}){
 const wide=game.widthScale>1;
 const twin=game.twinTracks;
 const W=wide?WIDE_W:1024;
 const cx=W/2;
 const crop=opts.cropTop??0;
 const {pushZ,coins}=game;

 if(opts.clear!==false)ctx.clearRect(0,0,W,CAB_H);
 if(crop>0){
  // 裁掉下層頂部橫幅；內容上移對齊裁切後美術（上層完整不動）
  const srcW=machine.naturalWidth||1024;
  ctx.drawImage(machine,0,crop,srcW,CAB_H-crop,0,0,W,CAB_H-crop);
  ctx.translate(0,-crop);
 }else{
  ctx.drawImage(machine,0,0,W,CAB_H);
 }

 if(twin&&game.centerDecor){
  renderSlot(ctx,game,W/2-512,game.slot);
 }else if(twin){
  const leftSlotX=project(-TWIN_LANE,OUTLETS.dragon.y,OUTLETS.dragon.z,cx).x-512;
  const rightSlotX=project(TWIN_LANE,OUTLETS.dragon.y,OUTLETS.dragon.z,cx).x-512;
  renderSlot(ctx,game,leftSlotX,game.slot);
  renderSlot(ctx,game,rightSlotX,game.slotB);
 }else if(wide){
  renderSlot(ctx,game,W*0.05,game.slot);
  renderSlot(ctx,game,W*0.05+900,game.slotB);
 }else renderSlot(ctx,game);

 const lanes=twin?[-TWIN_LANE,TWIN_LANE]:[0];
 for(const lane of lanes){
  for(const peg of pegs){
   const p=project(lane+peg.x,peg.y,.25,cx),size=24*(peg.radius ?? .105)/.105;
   sprite(1,p.x,p.y,size,size);
  }
 }

 if(!game.receiveOnly){const dp=project(game.dropX,10.1,0,cx);sprite(2,dp.x,dp.y,100,76);}
 if(twin){
  drawTrackGates(game,-TWIN_LANE,cx,0);
  drawTrackGates(game,TWIN_LANE,cx,7);
  drawSpinBars(game,cx);
  if(game.centerDecor)drawTrackDragon(game,0,cx,'left',0);
  else{
   drawTrackDragon(game,TWIN_DRAGON_LEFT,cx,'left',-TWIN_LANE);
   drawTrackDragon(game,TWIN_DRAGON_RIGHT,cx,'right',TWIN_LANE);
  }
 }else{
  drawTrackGates(game,0,cx,0);
  drawTrackDragon(game,0,cx,'left');
 }

 const frontY=project(0,.7,pushZ,cx).y;
 const artScale=platform.naturalWidth/2048;
 const shelfLeft=project(-game.halfWidth,.7,pushZ,cx).x;
 const shelfRight=project(game.halfWidth,.7,pushZ,cx).x;
 const shelfW=shelfRight-shelfLeft;
 // 平台外擴跟幣床對齊，避免左右多畫出沒珠的空角
 const flare=twin?28:80;
 ctx.save();
 ctx.beginPath();
 ctx.moveTo(shelfLeft-12,823);ctx.lineTo(shelfRight+12,823);
 ctx.lineTo(shelfRight+flare,1178);ctx.lineTo(shelfLeft-flare,1178);ctx.closePath();ctx.clip();
 ctx.drawImage(platform,28*artScale,166*artScale,1990*artScale,264*artScale,shelfLeft-20,801,shelfW+40,frontY-801);
 ctx.drawImage(platform,28*artScale,430*artScale,1990*artScale,140*artScale,shelfLeft-20,frontY,shelfW+40,32);
 ctx.restore();

 // 收穫籃跟著 harvestX 移動；素材左右 1/4 是黑落球道，只取中間寶箱拉滿避免黑邊
 const bayLeft=project(game.harvestX-game.rewardCatchHalf,0,FRONT_EXIT.edgeZ,cx).x;
 const bayRight=project(game.harvestX+game.rewardCatchHalf,0,FRONT_EXIT.edgeZ,cx).x;
 const bayWidth=Math.max(1,bayRight-bayLeft),bayTop=1174,bayHeight=300;
 const bw=bay.naturalWidth,bh=bay.naturalHeight;
 const chestX=bw*.25,chestW=bw*.5;
 ctx.drawImage(bay,chestX,0,chestW,bh,bayLeft,bayTop,bayWidth,bayHeight);

 const depth=(coin:typeof coins[number])=>{const p=coin.body.translation();return coin.entered?p.z*51+p.y*25:-p.y*48;};
 const ordered=[...coins].sort((a,b)=>depth(a)-depth(b));
 let splitterDrawn=false;
 const drawSplitter=()=>{
   const p=project(SPLITTER.x,SPLITTER.height/2,SPLITTER.z,cx);
   ctx.drawImage(splitter,p.x-22*SPLITTER.scale,p.y-21*SPLITTER.scale,44*SPLITTER.scale,42*SPLITTER.scale);splitterDrawn=true;
 };
 // 幣床是透視梯形：若用 z=0 的矩形裁切，前方左右會被切成空三角
 const bedBackL=project(-game.halfWidth-0.2,.7,0,cx).x;
 const bedBackR=project(game.halfWidth+0.2,.7,0,cx).x;
 const bedFrontL=project(-game.halfWidth-0.2,0,FRONT_EXIT.edgeZ,cx).x;
 const bedFrontR=project(game.halfWidth+0.2,0,FRONT_EXIT.edgeZ,cx).x;
 ctx.save();
 ctx.beginPath();
 ctx.moveTo(bedBackL,0);ctx.lineTo(bedBackR,0);
 ctx.lineTo(bedFrontR,1460);ctx.lineTo(bedFrontL,1460);ctx.closePath();ctx.clip();
 for(const coin of ordered){
   if(!splitterDrawn&&depth(coin)>=SPLITTER.z*51+SPLITTER.height*12.5)drawSplitter();
   const p=coin.body.translation(),s=project(p.x,p.y,p.z,cx);
   const size=(coin.entered?42+Math.max(0,p.z)*1.8:44)*(coin.kind==='gold'?1.5:1);
   if(coin.entered && p.y>=0 && p.y<1.2) {
     ctx.fillStyle='rgba(0,20,9,0.28)';
     ctx.beginPath();ctx.ellipse(s.x,s.y+size*.38,size*.38,size*.13,0,0,Math.PI*2);ctx.fill();
   }
   const artSize=size/.84;
   ctx.globalAlpha=coin.kind==='gold'?1:.88;
   ctx.drawImage(coin.kind==='gold'?gold:bead,s.x-artSize/2,s.y-artSize/2,artSize,artSize);
   ctx.globalAlpha=1;
 }
 if(!splitterDrawn)drawSplitter();
 ctx.restore();

 ctx.drawImage(bay,chestX,bh*.35,chestW,bh*.65,bayLeft,bayTop+bayHeight*.35,bayWidth,bayHeight*.65);
 ctx.drawImage(bay,chestX,bh*.91,chestW,bh*.09,bayLeft,bayTop+bayHeight*.91,bayWidth,bayHeight*.09);
 const elapsed=game.time-game.lastRewardTime;
 if(elapsed>=0 && elapsed<1.6) {
   const brightness=Math.pow(1-elapsed/1.6,1.6);
   const gx=(bayLeft+bayRight)/2,gy=bayTop+bayHeight*.61;
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=brightness;
   const halo=ctx.createRadialGradient(gx,gy,8,gx,gy,86);
   halo.addColorStop(0,'rgba(111,255,185,.85)');halo.addColorStop(.4,'rgba(39,236,135,.4)');halo.addColorStop(1,'rgba(28,221,123,0)');
   ctx.fillStyle=halo;ctx.fillRect(gx-86,gy-86,172,172);
   ctx.beginPath();ctx.ellipse(gx,gy,30,43,0,0,Math.PI*2);ctx.clip();
   ctx.filter='brightness(3.5) saturate(2)';
   ctx.drawImage(bay,chestX,0,chestW,bh,bayLeft,bayTop,bayWidth,bayHeight);
   ctx.restore();
 }
 renderCabinetCelebration(ctx,game,W);
 if(crop>0)ctx.translate(0,crop);
}

/** 上下機台銜接帶：柔化硬切縫＋金邊石橋 */
function paintCascadeJoin(seamY:number){
 const soft=90,bandH=52,pad=64;
 // 上下各一段霧化，吃掉硬切線
 const up=ctx.createLinearGradient(0,seamY-soft,0,seamY);
 up.addColorStop(0,'rgba(6,14,12,0)');
 up.addColorStop(.55,'rgba(10,20,17,0.35)');
 up.addColorStop(1,'rgba(12,22,18,0.72)');
 ctx.fillStyle=up;ctx.fillRect(0,seamY-soft,WIDE_W,soft);
 const down=ctx.createLinearGradient(0,seamY,0,seamY+soft);
 down.addColorStop(0,'rgba(12,22,18,0.72)');
 down.addColorStop(.45,'rgba(10,20,17,0.35)');
 down.addColorStop(1,'rgba(6,14,12,0)');
 ctx.fillStyle=down;ctx.fillRect(0,seamY,WIDE_W,soft);

 // 中央金銅飾帶
 const y=seamY-bandH/2;
 const metal=ctx.createLinearGradient(0,y,0,y+bandH);
 metal.addColorStop(0,'#1a1510');
 metal.addColorStop(.18,'#8a7040');
 metal.addColorStop(.42,'#e6d396');
 metal.addColorStop(.58,'#b8964e');
 metal.addColorStop(.82,'#8a7040');
 metal.addColorStop(1,'#1a1510');
 ctx.fillStyle=metal;
 ctx.beginPath();
 ctx.roundRect(pad,y,WIDE_W-pad*2,bandH,14);
 ctx.fill();

 // 內緣線＋翠綠光縫
 ctx.strokeStyle='rgba(232,208,144,0.55)';
 ctx.lineWidth=2;
 ctx.beginPath();
 ctx.roundRect(pad+6,y+6,WIDE_W-pad*2-12,bandH-12,10);
 ctx.stroke();
 const glow=ctx.createLinearGradient(pad+24,seamY-4,WIDE_W-pad-24,seamY+4);
 glow.addColorStop(0,'rgba(55,230,150,0)');
 glow.addColorStop(.2,'rgba(75,255,170,0.55)');
 glow.addColorStop(.5,'rgba(120,255,200,0.85)');
 glow.addColorStop(.8,'rgba(75,255,170,0.55)');
 glow.addColorStop(1,'rgba(55,230,150,0)');
 ctx.fillStyle=glow;
 ctx.fillRect(pad+24,seamY-3,WIDE_W-pad*2-48,6);

 // 兩側石柱銜接塊（取機櫃側壁紋理）
 const capW=110,capH=bandH+28,srcW=machine.naturalWidth||1024;
 for(const [sx,dx] of [[40,pad-18],[srcW-150,WIDE_W-pad-capW+18]] as const){
  ctx.save();
  ctx.beginPath();ctx.roundRect(dx,seamY-capH/2,capW,capH,12);ctx.clip();
  ctx.drawImage(machine,sx,620,110,90,dx,seamY-capH/2,capW,capH);
  ctx.restore();
  ctx.strokeStyle='rgba(194,167,100,0.45)';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(dx,seamY-capH/2,capW,capH,12);ctx.stroke();
 }
}

export function render(game:ActiveGame){
 if(isCascadeGame(game)){
  setDisplayLayout(true,true);
  ctx.clearRect(0,0,WIDE_W,STACK_H);
  // 上層完整（含收穫籃）
  ctx.save();paintCabinet(game.upper,{clear:false});ctx.restore();
  // 下層接在上層下方，只裁自己的頂部橫幅
  ctx.save();
  ctx.translate(0,CAB_H);
  ctx.beginPath();ctx.rect(0,0,WIDE_W,CAB_H-JOIN_CROP);ctx.clip();
  paintCabinet(game.lower,{clear:false,cropTop:JOIN_CROP});
  ctx.restore();
  paintCascadeJoin(CAB_H);
  return;
 }
 setDisplayLayout(isWideGame(game),false);
 paintCabinet(game);
}
