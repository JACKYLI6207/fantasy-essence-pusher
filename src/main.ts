import RAPIER from '@dimforge/rapier3d-compat';
import {CONFIG} from './config.ts';
import {loadArtwork,render,setDisplayLayout} from './rendering.ts';
import {SLOT_REWARDS} from './slot.ts';
import {marqueeMessage} from './celebration.ts';
import {PlayerWallet,type WalletStorage} from './wallet.ts';
import {ArcadeSession} from './arcade-session.ts';
import {getMachine,MACHINES,type MachineId} from './machines.ts';
import {gameCanDrop,gameCoinCount,isWideGame} from './dual-pusher.ts';
import {formatTimeScale,getGameTimeScale,isPresetScale,MAX_ACCUMULATED_GAME_TIME,planPhysicsFrame,scaleToSlider,setGameTimeScale,sliderToScale,TIME_SCALE_PRESETS,UI_UPDATE_MS} from './time-scale.ts';
import './style.css';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let storage:WalletStorage|undefined;
try{storage=window.localStorage;}catch{/* Browser storage can be disabled. */}
const wallet=new PlayerWallet(storage),session=new ArcadeSession(wallet);
let accumulator=0,previous=0,entering=false,readyPromise:Promise<void>|undefined,lastUiMs=0;
const dialog=$<HTMLDialogElement>('leave-dialog');
function resetClock(){accumulator=0;previous=0;}
function syncWallet(){
 const balance=wallet.gold.toLocaleString('en-US');
 $('gold-balance').textContent=balance;$('lobby-gold').textContent=balance;
}
function updateUI(){
 syncWallet();const game=session.game;if(!game)return;
 const wide=isWideGame(game);
 $('dropped').textContent=String(game.dropped);$('won').textContent=String(game.won);$('recycled').textContent=String(game.recycled);
 $<HTMLButtonElement>('drop').disabled=session.leaveRequested||!gameCanDrop(game);
 const auto=$<HTMLButtonElement>('auto-drop');auto.disabled=session.leaveRequested||game.gold<CONFIG.essenceCost;
 auto.setAttribute('aria-pressed',String(game.autoDrop));auto.textContent=game.autoDrop?'停止自動投入':'開啟自動投入';
 $('auto-status').textContent=game.gold<CONFIG.essenceCost?'金幣不足，已停止投入；精華入箱可回補金幣':game.autoDrop
  ?(wide?'寬機自動投入中 · 每顆 1 金幣':'自動投入中 · 每秒最多 2 顆 · 每顆 1 金幣')
  :(wide?'1 金幣投入 1 精華 · 左右球道交替 · 雙 SLOT':'1 金幣投入 1 精華 · 精華入箱返還 1 金幣');
 const message=marqueeMessage(game.slot,wide);if($('machine-announcement').textContent!==message)$('machine-announcement').textContent=message;
 const aSpin=game.slot.phase==='spinning'||game.slot.remaining>0||game.slot.queue>0;
 const bSpin=wide&&(game.slotB.phase==='spinning'||game.slotB.remaining>0||game.slotB.queue>0);
 $('slot-status').textContent=wide
  ?(aSpin||bSpin?`雙 SLOT${aSpin?' · 左運轉中':''}${bSpin?' · 右運轉中':''}`:'龍珠入箱交替啟動左右 SLOT')
  :(game.slot.remaining>0?`SLOT 派珠中 · 尚餘 ${game.slot.remaining} 顆${game.slot.queue>0?` · 待轉 ${game.slot.queue} 次`:''}`:game.slot.phase==='spinning'?`SLOT 旋轉中${game.slot.queue>0?` · 待轉 ${game.slot.queue} 次`:''}`:'龍珠落入中央寶箱可啟動 SLOT');
 const scale=getGameTimeScale();
 const speedNote=scale===1?'':` · 倍速 ${formatTimeScale(scale)}`;
 const coins=gameCoinCount(game);
 $('status').textContent=`運作中 · ${coins} 顆精華${wide?'（連體寬機）':''} · ${coins>=game.maxCoins?'珠床已滿，請等待回收':'點擊或空白鍵投幣'}${speedNote}`;
 syncTimeScaleUI();
}
function commitTimeScale(value:number){
 setGameTimeScale(value);syncTimeScaleUI();
 if(session.game&&!session.leaveRequested)updateUI();
}
function syncTimeScaleUI(){
 const scale=getGameTimeScale(),label=formatTimeScale(scale);
 $('time-scale-display').textContent=label;
 const input=$<HTMLInputElement>('time-scale'),slider=$<HTMLInputElement>('time-scale-slider');
 if(document.activeElement!==input)input.value=String(scale);
 if(document.activeElement!==slider){slider.value=String(scaleToSlider(scale));slider.setAttribute('aria-valuetext',label);}
 Array.from($<HTMLDivElement>('time-scale-presets').querySelectorAll<HTMLButtonElement>('.speed-preset')).forEach(button=>{
  const preset=Number(button.dataset.scale);
  button.setAttribute('aria-pressed',String(isPresetScale(scale,preset)));
 });
 $('time-scale-hint').textContent=scale===1?'1× 即時 · 物理、SLOT、自動投入同步加速':`${label} · 遊戲加速（畫面維持完整，僅優化物理）`;
}
function applyTimeScaleFromInput(){commitTimeScale(Number($<HTMLInputElement>('time-scale').value));}
function applyTimeScaleFromSlider(){commitTimeScale(sliderToScale(Number($<HTMLInputElement>('time-scale-slider').value)));}
function showLobby(){
 $('lobby-screen').hidden=false;$('machine-screen').hidden=true;$('lobby-wallet').hidden=false;$('machine-nav').hidden=true;
 $('page-title').textContent='冒險大廳';$('page-subtitle').textContent='選擇一台機台，展開你的下一段冒險。';document.title='冒險大廳 · 秘境金庫';
 setDisplayLayout(false);syncWallet();resetClock();
}
function ensureReady(){
 if(!readyPromise)readyPromise=Promise.all([RAPIER.init(),loadArtwork()]).then(()=>{}).catch(error=>{readyPromise=undefined;throw error;});
 return readyPromise;
}
async function enterMachine(id:MachineId){
 if(entering||session.game)return;entering=true;
 const machine=getMachine(id);
 const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-enter-machine]'));
 buttons.forEach(b=>{b.disabled=true;b.textContent='正在準備機台…';});
 $('lobby-error').textContent='';
 try{
  await ensureReady();if(!session.enter(id))return;
  setDisplayLayout(machine.layout==='dual');
  $('lobby-screen').hidden=true;$('machine-screen').hidden=false;$('lobby-wallet').hidden=true;$('machine-nav').hidden=false;
  $('page-title').textContent=machine.name;
  $('page-subtitle').textContent=machine.layout==='dual'?'雙球道雙龍頭，下方幣池互通、接幣口連體。':'掌握時機，讓精華穿越命運的針陣。';
  document.title=`${machine.name} · 推幣冒險`;
  $<HTMLDetailsElement>('adventure-details').open=false;
  $('loading').style.display='none';resetClock();updateUI();render(session.game!);
  history.pushState({view:'machine',id},'',`#machine/${id}`);window.scrollTo({top:0,behavior:'auto'});$('back-to-lobby').focus({preventScroll:true});
 }catch(error){$('lobby-error').textContent='機台載入失敗，請稍後重試。';console.error(error);}
 finally{
  entering=false;
  buttons.forEach(b=>{b.disabled=false;b.textContent='進入機台 →';});
 }
}
function requestLeave(){
 if(session.leaveRequested||!session.requestLeave())return;
 resetClock();dialog.showModal();$('keep-playing').focus();updateUI();
}
function cancelLeave(){session.cancelLeave();dialog.close();resetClock();updateUI();$('back-to-lobby').focus({preventScroll:true});}
function confirmLeave(){
 if(!session.confirmLeave())return;
 dialog.close();showLobby();history.replaceState({view:'lobby'},'','#lobby');window.scrollTo({top:0,behavior:'auto'});
 const first=document.querySelector<HTMLButtonElement>('[data-enter-machine]');first?.focus({preventScroll:true});
}
function drop(){if(session.game&&!document.hidden&&!session.leaveRequested){session.game.drop();updateUI();}}
function frame(ms:number){
 if(!previous)previous=ms;
 const scale=getGameTimeScale();
 const delta=Math.min((ms-previous)/1000,.05);previous=ms;
 if(session.game&&!document.hidden&&!session.leaveRequested){
  const coins=gameCoinCount(session.game);
  accumulator=Math.min(accumulator+delta*scale,MAX_ACCUMULATED_GAME_TIME);
  const plan=planPhysicsFrame(accumulator,CONFIG.fixedStep,coins,scale);
  for(let i=0;i<plan.steps;i++){session.step(plan.dt);accumulator-=plan.dt;}
  if(accumulator<0)accumulator=0;
  render(session.game);
  if(ms-lastUiMs>=UI_UPDATE_MS||scale<=1){lastUiMs=ms;updateUI();}
 }
 requestAnimationFrame(frame);
}
function buildLobbyCards(){
 const list=$<HTMLDivElement>('machine-card-list');list.replaceChildren();
 MACHINES.forEach((machine,index)=>{
  const article=document.createElement('article');article.className='machine-card';
  article.innerHTML=`
    <div class="machine-card-art"><img src="${new URL(`./assets/${machine.image}`,document.baseURI).href}" alt="${machine.name}預覽"><span class="machine-number">MACHINE ${String(index+1).padStart(2,'0')}</span><span class="open-badge">${machine.layout==='dual'?'雙機開放':'開放遊玩'}</span></div>
    <div class="machine-card-info"><span class="eyebrow">${machine.tag}</span><h3>${machine.name}</h3><p>${machine.description}</p><div class="machine-tags"><span>1 金幣 / 精華</span><span>${machine.layout==='dual'?'雙龍頭 · 雙 SLOT':'龍珠 SLOT'}</span><span>${machine.layout==='dual'?'雙球道':'隨機盤面'}</span></div><div class="machine-card-rule"><span>每次入場，都是新的盤面</span><p>${machine.layout==='dual'?'兩套原尺寸球道並排，下方幣池與接幣口連通。離開時進度清除，金幣保留。':'精華入箱返還金幣。離開時機台進度與未派獎勵清除，已持有金幣保留。'}</p></div><button type="button" data-enter-machine="${machine.id}">進入機台 →</button></div>`;
  list.append(article);
 });
 list.querySelectorAll<HTMLButtonElement>('[data-enter-machine]').forEach(button=>{
  button.addEventListener('click',()=>void enterMachine(button.dataset.enterMachine as MachineId));
 });
}

for(const preset of TIME_SCALE_PRESETS){
 const button=document.createElement('button');button.type='button';button.className='speed-preset';button.dataset.scale=String(preset);
 button.textContent=formatTimeScale(preset);button.setAttribute('aria-pressed','false');
 button.addEventListener('click',()=>commitTimeScale(preset));$<HTMLDivElement>('time-scale-presets').append(button);
}
syncTimeScaleUI();
$('time-scale-down').addEventListener('click',()=>commitTimeScale(getGameTimeScale()*.5));
$('time-scale-up').addEventListener('click',()=>commitTimeScale(getGameTimeScale()*2));
$('time-scale-reset').addEventListener('click',()=>commitTimeScale(1));
$('time-scale').addEventListener('change',applyTimeScaleFromInput);
$('time-scale').addEventListener('input',applyTimeScaleFromInput);
$('time-scale-slider').addEventListener('input',applyTimeScaleFromSlider);
$('drop').addEventListener('click',drop);
$('auto-drop').addEventListener('click',()=>{if(session.game&&!document.hidden&&!session.leaveRequested){session.game.setAutoDrop(!session.game.autoDrop);updateUI();}});
$('back-to-lobby').addEventListener('click',requestLeave);
$('keep-playing').addEventListener('click',cancelLeave);$('confirm-leave').addEventListener('click',confirmLeave);
dialog.addEventListener('cancel',event=>{event.preventDefault();cancelLeave();});
window.addEventListener('keydown',event=>{
 if(event.code==='Space'&&session.game&&!session.leaveRequested&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLButtonElement)&&!(event.target instanceof HTMLElement&&event.target.tagName==='SUMMARY')){
  event.preventDefault();if(!event.repeat)drop();
 }
});
document.addEventListener('visibilitychange',resetClock);
window.addEventListener('popstate',()=>{
 if(session.game){
  history.pushState({view:'machine',id:session.machineId},'',`#machine/${session.machineId}`);requestLeave();
 }else{history.replaceState({view:'lobby'},'','#lobby');showLobby();}
});
for(let i=0;i<SLOT_REWARDS.length;i++){
 const prize=SLOT_REWARDS[i],row=document.createElement('div');row.className='pay-row';
 const icon=document.createElement('span');icon.className='pay-icon';icon.style.backgroundPosition=`${i%3*50}% ${Math.floor(i/3)*50}%`;
 const text=document.createElement('span');text.textContent=`${prize.symbol} ×3`;
 const amount=document.createElement('b');amount.textContent=`${prize.amount} 顆`;
 const chance=document.createElement('small');chance.textContent=`${prize.weight/10}%`;row.append(icon,text,amount,chance);$('slot-paytable').append(row);
}
buildLobbyCards();
const hash=location.hash.match(/^#machine\/([a-z0-9-]+)$/);
const bootId=hash&&MACHINES.some(m=>m.id===hash[1])?hash[1] as MachineId:null;
history.replaceState({view:'lobby'},'','#lobby');showLobby();
if(bootId)void enterMachine(bootId);
requestAnimationFrame(frame);
