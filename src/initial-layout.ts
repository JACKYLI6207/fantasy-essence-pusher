import {CONFIG,SPLITTER} from './config.ts';

export function createInitialLayout(random:()=>number=Math.random,widthScale=1) {
  const unit=()=>Math.min(1-Number.EPSILON,Math.max(0,random()));
  const target=Math.ceil(CONFIG.initialCoins*widthScale);
  const min=Math.ceil(target*CONFIG.initialFillMin);
  const max=Math.floor(target*CONFIG.initialFillMax);
  const count=min+Math.floor(unit()*(max-min+1));
  const cols=Math.round(12*widthScale);
  const positions:{x:number;y:number;z:number}[]=[];
  for(let row=0;row<9;row++)for(let col=0;col<cols;col++) {
    const x=(col-(cols-1)/2)*.56+(row%2?.12:0),z=2.3+row*.55;
    if(Math.abs(x-SPLITTER.x)<=SPLITTER.halfWidth+CONFIG.radius && Math.abs(z-SPLITTER.z)<=SPLITTER.halfDepth+CONFIG.radius+.02)continue;
    positions.push({x,y:CONFIG.radius+.03,z});
  }
  for(let i=positions.length-1;i>0;i--) {
    const j=Math.floor(unit()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]];
  }
  return positions.slice(0,count);
}
