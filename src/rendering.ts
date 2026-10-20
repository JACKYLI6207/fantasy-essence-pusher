import { PEGS as pegs, FRONT_EXIT, PRIZE_SLOTS, OUTLETS, SPLITTER } from './config.ts';
import type { CoinPusher } from './physics.ts';
import {isDualGame,type ActiveGame} from './dual-pusher.ts';
import {loadSlotArtwork,renderSlot,renderCabinetCelebration} from './slot-rendering.ts';

const canvas=document.getElementById('game') as HTMLCanvasElement;
const ctx=canvas.getContext('2d')!;
const half=document.createElement('canvas');
half.width=1024;half.height=1536;
const halfCtx=half.getContext('2d')!;

const machine=new Image(),atlas=new Image(),platform=new Image(),bead=new Image(),bay=new Image(),gold=new Image(),gates=new Image(),dragon=new Image(),pipe=new Image(),splitter=new Image();
machine.src=new URL('./assets/machine.png',document.baseURI).href;atlas.src=new URL('./assets/sprites.png',document.baseURI).href;platform.src=new URL('./assets/platform.png',document.baseURI).href;bead.src=new URL('./assets/green-bead.png',document.baseURI).href;bay.src=new URL('./assets/treasure-bay.png',document.baseURI).href;
gold.src=new URL('./assets/gold-bead.png',document.baseURI).href;gates.src=new URL('./assets/prize-gates.png',document.baseURI).href;dragon.src=new URL('./assets/dragon-outlet.png',document.baseURI).href;pipe.src=new URL('./assets/side-pipe.png',document.baseURI).href;
splitter.src=new URL('./assets/triangle-splitter.png',document.baseURI).href;

let draw:CanvasRenderingContext2D=ctx;

/** 裁掉左右機台「相鄰側」外框寬度，讓兩櫃併成一座連體機。 */
const DUAL_JOIN=118;

export async function loadArtwork(){
 await Promise.all([machine.decode(),atlas.decode(),platform.decode(),bead.decode(),bay.decode(),gold.decode(),gates.decode(),dragon.decode(),pipe.decode(),splitter.decode(),loadSlotArtwork()]);
 setDisplayLayout(false);
}

export function dualCanvasWidth(){return 2048-2*DUAL_JOIN;}

export function setDisplayLayout(dual:boolean){
 const w=dual?dualCanvasWidth():1024;
 if(canvas.width!==w||canvas.height!==1536){canvas.width=w;canvas.height=1536;}
 const host=canvas.parentElement;
 if(host){
  host.classList.toggle('machine-dual',dual);
  host.style.aspectRatio=dual?`${w} / 1536`:'2 / 3';
 }
}

/** 中央銜接柱：蓋住裁切接縫，視覺上連成一台。 */
function paintDualBridge(joinX:number){
 const x=joinX;
 ctx.save();
 const body=ctx.createLinearGradient(x-36,0,x+36,0);
 body.addColorStop(0,'rgba(12,22,18,0)');
 body.addColorStop(.22,'#14241e');
 body.addColorStop(.5,'#1c3228');
 body.addColorStop(.78,'#14241e');
 body.addColorStop(1,'rgba(12,22,18,0)');
 ctx.fillStyle=body;ctx.fillRect(x-40,0,80,1536);
 ctx.fillStyle='#b89a52';ctx.fillRect(x-22,70,3,1400);ctx.fillRect(x+19,70,3,1400);
 ctx.fillStyle='#7a6430';ctx.fillRect(x-3,70,6,1400);
 for(const y of [160,420,720,1020,1280]){
  ctx.beginPath();ctx.ellipse(x,y,13,17,0,0,Math.PI*2);
  const gem=ctx.createRadialGradient(x-3,y-4,2,x,y,16);
  gem.addColorStop(0,'#b6ffd4');gem.addColorStop(.45,'#3dcf8a');gem.addColorStop(1,'#1a6b48');
  ctx.fillStyle=gem;ctx.fill();
  ctx.strokeStyle='#d4b86a88';ctx.lineWidth=1.5;ctx.stroke();
 }
 // 頂部連貫飾帶
 ctx.fillStyle='#0d1a16ee';ctx.fillRect(0,96,canvas.width,44);
 ctx.strokeStyle='#c2a76499';ctx.strokeRect(18.5,100.5,canvas.width-37,35);
 ctx.fillStyle='#e6d39a';ctx.font='bold 15px "Microsoft JhengHei",serif';
 ctx.textAlign='center';ctx.fillText('雙命運殿 · 並聯金庫',canvas.width/2,124);
 ctx.restore();
}

function project(x:number,y:number,z:number){const t=Math.max(0,z)/7;return {x:512+x*(z>0.8?83+25*t:87),y:835-y*48+z*51};}
function sprite(kind:number,x:number,y:number,w:number,h:number,angle=0){
 draw.save();draw.translate(x,y);draw.rotate(angle);
 const rects=[[50,110,540,530],[770,230,330,330],[20,710,520,400],[545,825,715,260]];
 const [sx,sy,sw,sh]=rects[kind];const scale=atlas.naturalWidth/1280;
 draw.drawImage(atlas,sx*scale,sy*scale,sw*scale,sh*scale,-w/2,-h/2,w,h);draw.restore();
}

function paintCabinet(target:CanvasRenderingContext2D,game:CoinPusher,lite=false){
 draw=target;
 const {dropX,pushZ,coins}=game;
 draw.clearRect(0,0,1024,1536);draw.drawImage(machine,0,0,1024,1536);
 if(!lite)renderSlot(draw,game);
 else {
  draw.fillStyle='#1a2a24';draw.fillRect(280,520,464,176);
  draw.strokeStyle='#b49b4c66';draw.strokeRect(280.5,520.5,463,175);
 }
 for(const peg of pegs){
  const p=project(peg.x,peg.y,.25),size=24*(peg.radius ?? .105)/.105;
  if(lite){draw.fillStyle='#c9b27a';draw.beginPath();draw.arc(p.x,p.y,size*.35,0,Math.PI*2);draw.fill();}
  else sprite(1,p.x,p.y,size,size);
 }
 const dp=project(dropX,10.1,0);sprite(2,dp.x,dp.y,100,76);
 const gateLeft=project(-3.65,2.45,.25).x,gateWidth=7.3*87/7;
 for(let i=0;i<7;i++) {
   const x=gateLeft+i*gateWidth,gs=gates.naturalWidth/2048;
   const active=!lite&&game.time-game.slotLights[i]<.8;
   draw.save();
   if(active) {draw.shadowColor=PRIZE_SLOTS[i]==='gold'?'#ffcc55':'#7bffba';draw.shadowBlur=18;}
   draw.drawImage(gates,879*gs,160*gs,30*gs,365*gs,x-5,702,10,76);
   if(i===6)draw.drawImage(gates,879*gs,160*gs,30*gs,365*gs,x+gateWidth-5,702,10,76);
   if(PRIZE_SLOTS[i]!=='none') {
     const art=PRIZE_SLOTS[i]==='gold'?gold:bead;
     const size=PRIZE_SLOTS[i]==='gold'?34:24;
     draw.drawImage(art,x+gateWidth/2-size/2,764,size,size);
   }
   draw.restore();
 }
 const frontY=project(0,.7,pushZ).y;
 const artScale=platform.naturalWidth/2048;
 draw.save();
 draw.beginPath();draw.moveTo(180,823);draw.lineTo(844,823);draw.lineTo(970,1178);draw.lineTo(54,1178);draw.closePath();draw.clip();
 draw.drawImage(platform,28*artScale,166*artScale,1990*artScale,264*artScale,48,801,928,frontY-801);
 draw.drawImage(platform,28*artScale,430*artScale,1990*artScale,140*artScale,48,frontY,928,32);
 draw.restore();
 const goldOutlet=project(OUTLETS.dragon.x,OUTLETS.dragon.y,OUTLETS.dragon.z);
 for(const [outlet,left,last] of [[OUTLETS.leftPipe,true,game.lastLeftEject],[OUTLETS.pipe,false,game.lastRightEject]] as const) {
   const p=project(outlet.x,outlet.y,outlet.z);draw.save();draw.translate(p.x,p.y);if(left)draw.scale(-1,1);
   if(!lite&&game.time-last<.18){draw.shadowColor='#7bffb5';draw.shadowBlur=18;}
   draw.drawImage(pipe,-62,-31,124,62);draw.restore();
 }
 draw.save();
 if(!lite&&game.time-game.lastGoldEject<.4){draw.shadowColor='#ffe58a';draw.shadowBlur=18;}
 draw.drawImage(dragon,goldOutlet.x-62,goldOutlet.y-53,124,106);draw.restore();
 const bayLeft=project(-FRONT_EXIT.halfWidth,0,FRONT_EXIT.edgeZ).x;
 const bayRight=project(FRONT_EXIT.halfWidth,0,FRONT_EXIT.edgeZ).x;
 const bayWidth=bayRight-bayLeft,bayTop=1174,bayHeight=300;
 draw.drawImage(bay,bayLeft,bayTop,bayWidth,bayHeight);
 const depth=(coin:typeof coins[number])=>{const p=coin.body.translation();return coin.entered?p.z*51+p.y*25:-p.y*48;};
 const ordered=lite?coins:[...coins].sort((a,b)=>depth(a)-depth(b));
 let splitterDrawn=false;
 const drawSplitter=()=>{
   const p=project(SPLITTER.x,SPLITTER.height/2,SPLITTER.z);
   draw.drawImage(splitter,p.x-22*SPLITTER.scale,p.y-21*SPLITTER.scale,44*SPLITTER.scale,42*SPLITTER.scale);splitterDrawn=true;
 };
 draw.save();
 draw.beginPath();draw.rect(54,0,916,1460);draw.clip();
 for(const coin of ordered){
   if(!splitterDrawn&&depth(coin)>=SPLITTER.z*51+SPLITTER.height*12.5)drawSplitter();
   const p=coin.body.translation(),s=project(p.x,p.y,p.z);
   const size=(coin.entered?42+Math.max(0,p.z)*1.8:44)*(coin.kind==='gold'?1.5:1);
   if(!lite&&coin.entered && p.y>=0 && p.y<1.2) {
     draw.fillStyle='rgba(0,20,9,0.28)';
     draw.beginPath();draw.ellipse(s.x,s.y+size*.38,size*.38,size*.13,0,0,Math.PI*2);draw.fill();
   }
   if(lite&&coin.kind==='green'){
     draw.fillStyle='rgba(70,210,140,0.9)';
     draw.beginPath();draw.arc(s.x,s.y,size*.42,0,Math.PI*2);draw.fill();
   }else{
     const artSize=size/.84;
     draw.globalAlpha=coin.kind==='gold'?1:.88;
     draw.drawImage(coin.kind==='gold'?gold:bead,s.x-artSize/2,s.y-artSize/2,artSize,artSize);
     draw.globalAlpha=1;
   }
 }
 if(!splitterDrawn)drawSplitter();
 draw.restore();
 const bw=bay.naturalWidth,bh=bay.naturalHeight;
 draw.drawImage(bay,bw*.25,bh*.35,bw*.5,bh*.65,bayLeft+bayWidth*.25,bayTop+bayHeight*.35,bayWidth*.5,bayHeight*.65);
 draw.drawImage(bay,0,bh*.91,bw,bh*.09,bayLeft,bayTop+bayHeight*.91,bayWidth,bayHeight*.09);
 if(!lite){
  const elapsed=game.time-game.lastRewardTime;
  if(elapsed>=0 && elapsed<1.6) {
   const brightness=Math.pow(1-elapsed/1.6,1.6);
   const gx=512,gy=bayTop+bayHeight*.61;
   draw.save();draw.globalCompositeOperation='screen';draw.globalAlpha=brightness;
   const halo=draw.createRadialGradient(gx,gy,8,gx,gy,86);
   halo.addColorStop(0,'rgba(111,255,185,.85)');halo.addColorStop(.4,'rgba(39,236,135,.4)');halo.addColorStop(1,'rgba(28,221,123,0)');
   draw.fillStyle=halo;draw.fillRect(gx-86,gy-86,172,172);
   draw.beginPath();draw.ellipse(gx,gy,30,43,0,0,Math.PI*2);draw.clip();
   draw.filter='brightness(3.5) saturate(2)';draw.drawImage(bay,bayLeft,bayTop,bayWidth,bayHeight);
   draw.restore();
  }
  renderCabinetCelebration(draw,game);
 }
}

/** 單機或雙機繪製入口。 */
export function render(game:ActiveGame,lite=false){
 if(isDualGame(game)){
  setDisplayLayout(true);
  const join=DUAL_JOIN,halfW=1024-join,seamX=halfW;
  // 左櫃：去掉右側外框；右櫃：去掉左側外框，兩側內框重疊消失 → 連成一台
  paintCabinet(halfCtx,game.left,lite);
  ctx.drawImage(half,0,0,halfW,1536,0,0,halfW,1536);
  paintCabinet(halfCtx,game.right,lite);
  ctx.drawImage(half,join,0,halfW,1536,seamX,0,halfW,1536);
  paintDualBridge(seamX);
 }else{
  setDisplayLayout(false);
  paintCabinet(ctx,game,lite);
 }
}
