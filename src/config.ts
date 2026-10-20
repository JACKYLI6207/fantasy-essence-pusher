export const CONFIG = {
  fixedStep: 1 / 60,
  maxCoins: 600,
  essenceEjectInterval: .08,
  radius: 0.25,

  dropCooldown: 0.5,
  pusherAngularSpeed: 1.35*1.2,
  initialCoins: 108,
  initialFillMin: .6,
  initialFillMax: .8,
  startingGold: 1000,
  essenceCost: 1,
  essenceReturnGold: 1,
};
export const PEGS: { x: number; y: number; radius?: number }[] = [];
export const SPLITTER = {x:0,z:5.5,scale:1.6,halfWidth:.18*1.6,halfDepth:.25*1.6,height:.42*1.6};
export const OUTLETS = {
  dragon: {x:0,y:7.35,z:.25},
  goldSpawn: {x:0,y:6.15,z:.32},
  pipe: {x:3.45,y:1.55,z:2.75},
  leftPipe: {x:-3.45,y:1.55,z:2.75},
  greenSpawn: {x:2.8,y:1.55,z:2.75},
  leftGreenSpawn: {x:-2.8,y:1.55,z:2.75},
};
export const PRIZE_SLOTS = ['none','green','none','gold','none','green','none'] as const;
export type PrizeKind = (typeof PRIZE_SLOTS)[number];
export function prizeSlotIndex(x: number, halfWidth = 3.65) {
  const span = halfWidth * 2;
  return Math.max(0,Math.min(6,Math.floor((x+halfWidth)/(span/7))));
}
export const FRONT_EXIT = { halfWidth: 3.65, rewardHalfWidth: 1.825, edgeZ: 6.8 };
/** 七格判定每一格的世界寬度。 */
export const PRIZE_GATE = (FRONT_EXIT.halfWidth * 2) / 7;
/**
 * 雙命運殿左右球道中心。
 * = halfWidth，使左右各 7 格無縫接成 14 格等寬，避免中間窄縫。
 */
export const TWIN_LANE = FRONT_EXIT.halfWidth;
/** 吐金球龍頭：相對球道中心（由朝內一格再朝外一格＝回球道中心）。 */
export const TWIN_DRAGON_LEFT = -TWIN_LANE;
export const TWIN_DRAGON_RIGHT = TWIN_LANE;
/** 下層左右對稱旋轉橫槓（影響綠／金球走向）。 */
export const SPIN_BARS = {
  // 相對原位朝外各 2 格
  x: 2.75 + PRIZE_GATE * 2,
  y: 7.05,
  z: .25,
  halfLength: .95,
  halfThick: .09,
  halfDepth: .22,
  angularSpeed: 2.15,
} as const;
export function twinDragonX(lane: 'left'|'right'|undefined) {
  return lane==='right'?TWIN_DRAGON_RIGHT:lane==='left'?TWIN_DRAGON_LEFT:0;
}
export type ExitZone = 'reward' | 'recycle';
// A bead centred exactly on a divider belongs to the outer recovery zone.
export function classifyFrontExit(x: number, rewardHalfWidth = FRONT_EXIT.rewardHalfWidth): ExitZone {
  return Math.abs(x) < rewardHalfWidth ? 'reward' : 'recycle';
}
export function twinLaneCenter(x: number) {
  return x < 0 ? -TWIN_LANE : TWIN_LANE;
}
/**
 * 連體寬機共用收穫籃：中央一半為獎勵（入箱），左右外側為回收坑。
 * （勿用左右球道中心判定，否則正中收穫籃會被誤判成回收。）
 */
export function classifyTwinFrontExit(x: number, bedHalfWidth = TWIN_LANE + FRONT_EXIT.halfWidth): ExitZone {
  return Math.abs(x) < bedHalfWidth * 0.5 ? 'reward' : 'recycle';
}
export function twinPrizeSlotIndex(x: number) {
  return prizeSlotIndex(x - twinLaneCenter(x), FRONT_EXIT.halfWidth);
}
// Offset upper rows intercept one another's vertical gaps. The lower rows
// retain clearance for gold beads emitted beneath the dragon.
const rows = [
  {y:8.9,xs:[-2.9,-1.74,-.58,.58,1.74,2.9]},
  {y:7.95,xs:[-2.32,-1.16,1.16,2.32]},
  {y:6.65,xs:[-2.7,-1.55,1.55,2.7]},
  {y:5.1,xs:[-2.025,-.675,.675,2.025]},
  {y:3.95,xs:[-2.7,-1.2,0,1.2,2.7]},
];
for(const row of rows) for(const x of row.xs) PEGS.push({x,y:row.y,radius:row.y===3.95 && x===0?.25:.105});








