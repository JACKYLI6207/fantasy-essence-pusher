import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from './config.ts';
import { CoinPusher } from './physics.ts';
import { loadArtwork, render } from './rendering.ts';
import './style.css';
import { SLOT_REWARDS } from './slot.ts';
import {marqueeMessage} from './celebration.ts';

const $ = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
let game: CoinPusher;
let paused=document.hidden, accumulator=0, previous=0;

function updateUI() {
  $('dropped').textContent=String(game.dropped);
  $('won').textContent=String(game.won);
  $('recycled').textContent=String(game.recycled);
  $<HTMLButtonElement>('drop').disabled=game.time-game.lastDrop+1e-9<CONFIG.dropCooldown || game.coins.length>=CONFIG.maxCoins;
  const message=marqueeMessage(game.slot);
  if($('machine-announcement').textContent!==message)$('machine-announcement').textContent=message;
  $('slot-status').textContent=game.slot.remaining>0?`SLOT 派珠中 · 尚餘 ${game.slot.remaining} 顆${game.slot.queue>0?` · 待轉 ${game.slot.queue} 次`:''}`:game.slot.phase==='spinning'?`SLOT 旋轉中${game.slot.queue>0?` · 待轉 ${game.slot.queue} 次`:''}`:'龍珠落入中央寶箱可啟動 SLOT';
  $('status').textContent=`運作中 · ${game.coins.length} 顆精華 · ${game.coins.length>=CONFIG.maxCoins?'珠床已滿，請等待回收':'點擊或空白鍵投幣'}`;
}
function drop() { if(game && !paused) { game.drop(); updateUI(); } }
function frame(ms:number) {
  if(!previous) previous=ms;
  const delta=Math.min((ms-previous)/1000,.1);
  previous=ms;
  if(!paused) {
    accumulator+=delta;
    while(accumulator>=CONFIG.fixedStep) { game.step(); accumulator-=CONFIG.fixedStep; }
    render(game);updateUI();
  }
  requestAnimationFrame(frame);
}
$('drop').addEventListener('click',drop);
window.addEventListener('keydown',e=> {
  if(e.code==='Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
    e.preventDefault();if(!e.repeat) drop();
  }
});
document.addEventListener('visibilitychange',()=> { paused=document.hidden;previous=0;accumulator=0; });
async function boot() {
  try {
    await Promise.all([RAPIER.init(),loadArtwork()]);
    game=new CoinPusher();
    $('loading').style.display='none';
    $<HTMLButtonElement>('drop').disabled=false;
    requestAnimationFrame(frame);
  } catch(error) {
    $('loading').textContent='機台載入失敗，請重新整理。';console.error(error);
  }
}
void boot();
for(let i=0;i<SLOT_REWARDS.length;i++) {
  const prize=SLOT_REWARDS[i];const row=document.createElement('div');row.className='pay-row';
  const icon=document.createElement('span');icon.className='pay-icon';icon.style.backgroundPosition=`${i%3*50}% ${Math.floor(i/3)*50}%`;
  const text=document.createElement('span');text.textContent=`${prize.symbol} ×3`;
  const amount=document.createElement('b');amount.textContent=`${prize.amount} 顆`;
  const chance=document.createElement('small');chance.textContent=`${prize.weight/10}%`;
  row.append(icon,text,amount,chance);$('slot-paytable').append(row);
}


