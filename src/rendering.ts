import { PEGS as pegs, FRONT_EXIT, PRIZE_SLOTS, OUTLETS, SPLITTER, TWIN_LANE, TWIN_DRAGON_LEFT, TWIN_DRAGON_RIGHT, type PrizeKind } from './config.ts';
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
/** 下層裁掉機櫃頂部獅鷲／寶石橫幅，與上層接幣口銜接 */
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
  // 裁掉頂部橫幅後上移銜接；內容座標同步上移
  ctx.drawImage(machine,0,crop,machine.naturalWidth||1024,CAB_H-crop,0,0,W,CAB_H-crop);
  ctx.translate(0,-crop);
 }else{
  ctx.drawImage(machine,0,0,W,CAB_H);
 }

 if(twin && game.centerDecor){
  // 下層：單一拉霸置中
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
  if(game.centerDecor){
   // 下層：單一龍頭置中；側管仍跟左右球道
   drawTrackDragon(game,0,cx,'left',0);
  }else{
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
 const flare=twin?28:80;
 ctx.save();
 ctx.beginPath();
 ctx.moveTo(shelfLeft-12,823);ctx.lineTo(shelfRight+12,823);
 ctx.lineTo(shelfRight+flare,1178);ctx.lineTo(shelfLeft-flare,1178);ctx.closePath();ctx.clip();
 ctx.drawImage(platform,28*artScale,166*artScale,1990*artScale,264*artScale,shelfLeft-20,801,shelfW+40,frontY-801);
 ctx.drawImage(platform,28*artScale,430*artScale,1990*artScale,140*artScale,shelfLeft-20,frontY,shelfW+40,32);
 ctx.restore();

 const bayLeft=project(-game.halfWidth,0,FRONT_EXIT.edgeZ,cx).x;
 const bayRight=project(game.halfWidth,0,FRONT_EXIT.edgeZ,cx).x;
 const bayWidth=bayRight-bayLeft,bayTop=1174,bayHeight=300;
 ctx.drawImage(bay,bayLeft,bayTop,bayWidth,bayHeight);

 const depth=(coin:typeof coins[number])=>{const p=coin.body.translation();return coin.entered?p.z*51+p.y*25:-p.y*48;};
 const ordered=[...coins].sort((a,b)=>depth(a)-depth(b));
 let splitterDrawn=false;
 const drawSplitter=()=>{
   const p=project(SPLITTER.x,SPLITTER.height/2,SPLITTER.z,cx);
   ctx.drawImage(splitter,p.x-22*SPLITTER.scale,p.y-21*SPLITTER.scale,44*SPLITTER.scale,42*SPLITTER.scale);splitterDrawn=true;
 };
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

 const bw=bay.naturalWidth,bh=bay.naturalHeight;
 ctx.drawImage(bay,bw*.25,bh*.35,bw*.5,bh*.65,bayLeft+bayWidth*.25,bayTop+bayHeight*.35,bayWidth*.5,bayHeight*.65);
 ctx.drawImage(bay,0,bh*.91,bw,bh*.09,bayLeft,bayTop+bayHeight*.91,bayWidth,bayHeight*.09);
 const elapsed=game.time-game.lastRewardTime;
 if(elapsed>=0 && elapsed<1.6) {
   const brightness=Math.pow(1-elapsed/1.6,1.6);
   const gx=cx,gy=bayTop+bayHeight*.61;
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=brightness;
   const halo=ctx.createRadialGradient(gx,gy,8,gx,gy,86);
   halo.addColorStop(0,'rgba(111,255,185,.85)');halo.addColorStop(.4,'rgba(39,236,135,.4)');halo.addColorStop(1,'rgba(28,221,123,0)');
   ctx.fillStyle=halo;ctx.fillRect(gx-86,gy-86,172,172);
   ctx.beginPath();ctx.ellipse(gx,gy,30,43,0,0,Math.PI*2);ctx.clip();
   ctx.filter='brightness(3.5) saturate(2)';ctx.drawImage(bay,bayLeft,bayTop,bayWidth,bayHeight);
   ctx.restore();
 }
 renderCabinetCelebration(ctx,game,W);
 if(crop>0)ctx.translate(0,crop);
}

export function render(game:ActiveGame){
 if(isCascadeGame(game)){
  setDisplayLayout(true,true);
  ctx.clearRect(0,0,WIDE_W,STACK_H);
  ctx.save();paintCabinet(game.upper,{clear:false});ctx.restore();
  // 下層上移 JOIN_CROP，裁掉紅框頂部橫幅後銜接上層
  ctx.save();
  ctx.translate(0,CAB_H-JOIN_CROP);
  ctx.beginPath();ctx.rect(0,0,WIDE_W,CAB_H-JOIN_CROP);ctx.clip();
  paintCabinet(game.lower,{clear:false,cropTop:JOIN_CROP});
  ctx.restore();
  return;
 }
 setDisplayLayout(isWideGame(game),false);
 paintCabinet(game);
}
