import { PEGS as pegs, FRONT_EXIT, PRIZE_SLOTS, OUTLETS, SPLITTER } from './config.ts';
import type { CoinPusher } from './physics.ts';
import {loadSlotArtwork,renderSlot,renderCabinetCelebration} from './slot-rendering.ts';
const canvas=document.getElementById('game') as HTMLCanvasElement;
const ctx=canvas.getContext('2d')!;
const machine=new Image(),atlas=new Image(),platform=new Image(),bead=new Image(),bay=new Image(),gold=new Image(),gates=new Image(),dragon=new Image(),pipe=new Image(),splitter=new Image();
machine.src=new URL('./assets/machine.png',document.baseURI).href;atlas.src=new URL('./assets/sprites.png',document.baseURI).href;platform.src=new URL('./assets/platform.png',document.baseURI).href;bead.src=new URL('./assets/green-bead.png',document.baseURI).href;bay.src=new URL('./assets/treasure-bay.png',document.baseURI).href;
gold.src=new URL('./assets/gold-bead.png',document.baseURI).href;gates.src=new URL('./assets/prize-gates.png',document.baseURI).href;dragon.src=new URL('./assets/dragon-outlet.png',document.baseURI).href;pipe.src=new URL('./assets/side-pipe.png',document.baseURI).href;
splitter.src=new URL('./assets/triangle-splitter.png',document.baseURI).href;
export async function loadArtwork(){await Promise.all([machine.decode(),atlas.decode(),platform.decode(),bead.decode(),bay.decode(),gold.decode(),gates.decode(),dragon.decode(),pipe.decode(),splitter.decode(),loadSlotArtwork()]);canvas.width=1024;canvas.height=1536;}
// AI cabinet and sprite artwork supply visible machine parts. These coordinates
// map vertical pin board and horizontal lower shelf onto the painted cabinet.
function project(x:number,y:number,z:number){const t=Math.max(0,z)/7;return {x:512+x*(z>0.8?83+25*t:87),y:835-y*48+z*51};}
function sprite(kind:number,x:number,y:number,w:number,h:number,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);const rects=[[50,110,540,530],[770,230,330,330],[20,710,520,400],[545,825,715,260]];const [sx,sy,sw,sh]=rects[kind];const scale=atlas.naturalWidth/1280;ctx.drawImage(atlas,sx*scale,sy*scale,sw*scale,sh*scale,-w/2,-h/2,w,h);ctx.restore();}
export function render(game: CoinPusher, lite=false){
 const {dropX,pushZ,coins}=game;
 ctx.clearRect(0,0,1024,1536);ctx.drawImage(machine,0,0,1024,1536);
 if(!lite)renderSlot(ctx,game);
 else {
  ctx.fillStyle='#1a2a24';ctx.fillRect(280,520,464,176);
  ctx.strokeStyle='#b49b4c66';ctx.strokeRect(280.5,520.5,463,175);
 }
 for(const peg of pegs){
  const p=project(peg.x,peg.y,.25),size=24*(peg.radius ?? .105)/.105;
  if(lite){ctx.fillStyle='#c9b27a';ctx.beginPath();ctx.arc(p.x,p.y,size*.35,0,Math.PI*2);ctx.fill();}
  else sprite(1,p.x,p.y,size,size);
 }
 const dp=project(dropX,10.1,0);sprite(2,dp.x,dp.y,100,76);
 const gateLeft=project(-3.65,2.45,.25).x,gateWidth=7.3*87/7;
 for(let i=0;i<7;i++) {
   const x=gateLeft+i*gateWidth,gs=gates.naturalWidth/2048;
   const active=!lite&&game.time-game.slotLights[i]<.8;
   ctx.save();
   if(active) {ctx.shadowColor=PRIZE_SLOTS[i]==='gold'?'#ffcc55':'#7bffba';ctx.shadowBlur=18;}
   ctx.drawImage(gates,879*gs,160*gs,30*gs,365*gs,x-5,702,10,76);
   if(i===6)ctx.drawImage(gates,879*gs,160*gs,30*gs,365*gs,x+gateWidth-5,702,10,76);
   if(PRIZE_SLOTS[i]!=='none') {
     const art=PRIZE_SLOTS[i]==='gold'?gold:bead;
     const size=PRIZE_SLOTS[i]==='gold'?34:24;
     ctx.drawImage(art,x+gateWidth/2-size/2,764,size,size);
   }
   ctx.restore();
 }
 const frontY=project(0,.7,pushZ).y;
 const artScale=platform.naturalWidth/2048;
 ctx.save();
 ctx.beginPath();ctx.moveTo(180,823);ctx.lineTo(844,823);ctx.lineTo(970,1178);ctx.lineTo(54,1178);ctx.closePath();ctx.clip();
 ctx.drawImage(platform,28*artScale,166*artScale,1990*artScale,264*artScale,48,801,928,frontY-801);
 ctx.drawImage(platform,28*artScale,430*artScale,1990*artScale,140*artScale,48,frontY,928,32);
 ctx.restore();
 const goldOutlet=project(OUTLETS.dragon.x,OUTLETS.dragon.y,OUTLETS.dragon.z);
 for(const [outlet,left,last] of [[OUTLETS.leftPipe,true,game.lastLeftEject],[OUTLETS.pipe,false,game.lastRightEject]] as const) {
   const p=project(outlet.x,outlet.y,outlet.z);ctx.save();ctx.translate(p.x,p.y);if(left)ctx.scale(-1,1);
   if(!lite&&game.time-last<.18){ctx.shadowColor='#7bffb5';ctx.shadowBlur=18;}
   ctx.drawImage(pipe,-62,-31,124,62);ctx.restore();
 }
 ctx.save();
 if(!lite&&game.time-game.lastGoldEject<.4){ctx.shadowColor='#ffe58a';ctx.shadowBlur=18;}
 ctx.drawImage(dragon,goldOutlet.x-62,goldOutlet.y-53,124,106);ctx.restore();
 const bayLeft=project(-FRONT_EXIT.halfWidth,0,FRONT_EXIT.edgeZ).x;
 const bayRight=project(FRONT_EXIT.halfWidth,0,FRONT_EXIT.edgeZ).x;
 const bayWidth=bayRight-bayLeft,bayTop=1174,bayHeight=300;
 ctx.drawImage(bay,bayLeft,bayTop,bayWidth,bayHeight);
 const depth=(coin:typeof coins[number])=>{const p=coin.body.translation();return coin.entered?p.z*51+p.y*25:-p.y*48;};
 // 輕量模式略過深度排序，避免每幀 O(n log n)
 const ordered=lite?coins:[...coins].sort((a,b)=>depth(a)-depth(b));
 let splitterDrawn=false;
 const drawSplitter=()=>{
   const p=project(SPLITTER.x,SPLITTER.height/2,SPLITTER.z);
   ctx.drawImage(splitter,p.x-22*SPLITTER.scale,p.y-21*SPLITTER.scale,44*SPLITTER.scale,42*SPLITTER.scale);splitterDrawn=true;
 };
 // 一次裁切整批珠子，避免每顆 save/clip/restore
 ctx.save();
 ctx.beginPath();ctx.rect(54,0,916,1460);ctx.clip();
 for(const coin of ordered){
   if(!splitterDrawn&&depth(coin)>=SPLITTER.z*51+SPLITTER.height*12.5)drawSplitter();
   const p=coin.body.translation(),s=project(p.x,p.y,p.z);
   const size=(coin.entered?42+Math.max(0,p.z)*1.8:44)*(coin.kind==='gold'?1.5:1);
   if(!lite&&coin.entered && p.y>=0 && p.y<1.2) {
     ctx.fillStyle='rgba(0,20,9,0.28)';
     ctx.beginPath();ctx.ellipse(s.x,s.y+size*.38,size*.38,size*.13,0,0,Math.PI*2);ctx.fill();
   }
   if(lite&&coin.kind==='green'){
     ctx.fillStyle='rgba(70,210,140,0.9)';
     ctx.beginPath();ctx.arc(s.x,s.y,size*.42,0,Math.PI*2);ctx.fill();
   }else{
     const artSize=size/.84;
     ctx.globalAlpha=coin.kind==='gold'?1:.88;
     ctx.drawImage(coin.kind==='gold'?gold:bead,s.x-artSize/2,s.y-artSize/2,artSize,artSize);
     ctx.globalAlpha=1;
   }
 }
 if(!splitterDrawn)drawSplitter();
 ctx.restore();
 const bw=bay.naturalWidth,bh=bay.naturalHeight;
 ctx.drawImage(bay,bw*.25,bh*.35,bw*.5,bh*.65,bayLeft+bayWidth*.25,bayTop+bayHeight*.35,bayWidth*.5,bayHeight*.65);
 ctx.drawImage(bay,0,bh*.91,bw,bh*.09,bayLeft,bayTop+bayHeight*.91,bayWidth,bayHeight*.09);
 if(!lite){
  const elapsed=game.time-game.lastRewardTime;
  if(elapsed>=0 && elapsed<1.6) {
   const brightness=Math.pow(1-elapsed/1.6,1.6);
   const gx=512,gy=bayTop+bayHeight*.61;
   ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=brightness;
   const halo=ctx.createRadialGradient(gx,gy,8,gx,gy,86);
   halo.addColorStop(0,'rgba(111,255,185,.85)');halo.addColorStop(.4,'rgba(39,236,135,.4)');halo.addColorStop(1,'rgba(28,221,123,0)');
   ctx.fillStyle=halo;ctx.fillRect(gx-86,gy-86,172,172);
   ctx.beginPath();ctx.ellipse(gx,gy,30,43,0,0,Math.PI*2);ctx.clip();
   ctx.filter='brightness(3.5) saturate(2)';ctx.drawImage(bay,bayLeft,bayTop,bayWidth,bayHeight);
   ctx.restore();
  }
  renderCabinetCelebration(ctx,game);
 }
}


