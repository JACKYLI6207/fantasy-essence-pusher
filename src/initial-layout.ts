import {CONFIG,SPLITTER} from './config.ts';

export function createInitialLayout(random:()=>number=Math.random) {
  const unit=()=>Math.min(1-Number.EPSILON,Math.max(0,random()));
  const min=Math.ceil(CONFIG.initialCoins*CONFIG.initialFillMin);
  const max=Math.floor(CONFIG.initialCoins*CONFIG.initialFillMax);
  const count=min+Math.floor(unit()*(max-min+1));
  const positions:{x:number;y:number;z:number}[]=[];
  for(let row=0;row<9;row++)for(let col=0;col<12;col++) {
    const x=(col-5.5)*.56+(row%2?.12:0),z=2.3+row*.55;
    // Leave room around the splitter rather than spawning essence inside it.
    if(Math.abs(x-SPLITTER.x)<=SPLITTER.halfWidth+CONFIG.radius && Math.abs(z-SPLITTER.z)<=SPLITTER.halfDepth+CONFIG.radius+.02)continue;
    positions.push({x,y:CONFIG.radius+.03,z});
  }
  for(let i=positions.length-1;i>0;i--) {
    const j=Math.floor(unit()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];
  }
  return positions.slice(0,count);
}
