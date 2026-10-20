import type {CoinPusher} from './physics.ts';
import {REEL_STOPS,SLOT_REWARDS} from './slot.ts';
import {celebration,marqueeMessage} from './celebration.ts';
const frame=new Image(),symbols=new Image();
frame.src=new URL('./assets/slot-frame.png',document.baseURI).href;symbols.src=new URL('./assets/slot-symbols.png',document.baseURI).href;
export async function loadSlotArtwork(){await Promise.all([frame.decode(),symbols.decode()]);}
export function drawSlotSymbol(ctx:CanvasRenderingContext2D,index:number,x:number,y:number,size:number){
 const cell=symbols.naturalWidth/3;
 ctx.drawImage(symbols,(index%3)*cell,Math.floor(index/3)*cell,cell,cell,x-size/2,y-size/2,size,size);
}
export function renderSlot(ctx:CanvasRenderingContext2D,game:CoinPusher) {
 const slot=game.slot,elapsed=game.time-slot.startTime;
 ctx.save();
 // A recessed display sits behind the transparent pin plane. Physical pins
 // remain visible in front; no invisible collisions are introduced by the UI.
 ctx.drawImage(frame,280,520,464,176);
 const left=316,top=554,height=90,width=116;
 for(let reel=0;reel<3;reel++) {
   const x=left+reel*138;
   ctx.save();ctx.beginPath();ctx.rect(x,top,width,height);ctx.clip();
   const stopped=slot.phase!=='spinning'||elapsed>=REEL_STOPS[reel];
   if(stopped) {
     const index=slot.phase==='idle'&&slot.spins===0?[0,2,8][reel]:slot.prizeIndex;
     drawSlotSymbol(ctx,index,x+width/2,top+height/2,88);
   } else {
     const progress=Math.min(1,Math.max(0,elapsed/REEL_STOPS[reel]));
     const position=(9*(5+reel*2)+slot.prizeIndex)*(1-Math.pow(1-progress,3));
     const base=Math.floor(position),offset=position-base;
     for(let row=-1;row<=1;row++)drawSlotSymbol(ctx,(base+row+90)%9,x+width/2,top+height/2+(row-offset)*height,84);
   }
   ctx.restore();
 }
 ctx.textAlign='center';ctx.font='bold 17px "Microsoft JhengHei",sans-serif';
 ctx.fillStyle='#ead499';
 const label=slot.phase==='spinning'?'命運轉動中…':slot.spins>0?`${SLOT_REWARDS[slot.prizeIndex].symbol}連線 +${SLOT_REWARDS[slot.prizeIndex].amount} 精華`:'龍珠入寶箱 · 啟動 SLOT';
 ctx.fillText(label,512,678);
 if(slot.phase==='result') {
   ctx.save();ctx.globalAlpha=.45+.35*Math.sin(game.time*7);ctx.strokeStyle='#f8dc85';ctx.lineWidth=2;
   ctx.strokeRect(312,550,400,98);ctx.restore();
 }
 ctx.restore();
}
export {SLOT_REWARDS};
export function renderCabinetCelebration(ctx:CanvasRenderingContext2D,game:CoinPusher) {
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fx=celebration(game.slot,game.time,reduced);
 if(fx.intensity>0) {
   ctx.save();ctx.globalCompositeOperation='screen';
   const jackpot=fx.tier==='jackpot';
   // Soft cabinet edge lighting, capped to two pulses per second; no whiteout.
   const edge=ctx.createLinearGradient(0,0,1024,0);
   const color=jackpot?'255,199,67':'86,241,167';
   edge.addColorStop(0,`rgba(${color},${fx.intensity*(jackpot?.65:.28)})`);
   edge.addColorStop(.25,'rgba(0,0,0,0)');edge.addColorStop(.75,'rgba(0,0,0,0)');
   edge.addColorStop(1,`rgba(${color},${fx.intensity*(jackpot?.65:.28)})`);
   ctx.fillStyle=edge;ctx.fillRect(0,0,1024,1536);
   ctx.strokeStyle=`rgba(${color},${fx.intensity})`;ctx.lineWidth=jackpot?12:5;
   ctx.shadowColor=`rgb(${color})`;ctx.shadowBlur=jackpot?40:18;ctx.strokeRect(24,20,976,1490);
   if(jackpot) {
     ctx.globalAlpha=fx.intensity*.55;
     for(let i=0;i<16;i++) {
       const angle=i*Math.PI/8,travel=40+(game.time-game.slot.resultTime)*65;
       const x=512+Math.cos(angle)*travel,y=600+Math.sin(angle)*travel;
       ctx.fillStyle='#ffe8a3';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
     }
   }
   ctx.restore();
 }
 // Reuse the AI-painted bezel for an integrated marquee beneath the crest.
 ctx.save();ctx.drawImage(frame,180,251,664,76);
 ctx.beginPath();ctx.rect(237,268,550,39);ctx.clip();
 ctx.font='bold 22px "Microsoft JhengHei",sans-serif';ctx.textBaseline='middle';
 ctx.fillStyle=game.slot.lastAmount>=100&&game.slot.phase!=='spinning'?'#ffe49c':'#bcecd3';
 const text=marqueeMessage(game.slot),width=ctx.measureText(text).width;
 if(width<=536||reduced){ctx.textAlign='center';ctx.fillText(text,512,288,536);}
 else {
   const scroll=(game.time*.055%1)*(width+100);ctx.textAlign='left';
   ctx.fillText(text,249-scroll,288);ctx.fillText(text,249-scroll+width+100,288);
 }
 ctx.restore();
}

