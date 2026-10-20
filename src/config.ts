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
export function prizeSlotIndex(x: number) {
  return Math.max(0,Math.min(6,Math.floor((x+3.65)/(7.3/7))));
}
export const FRONT_EXIT = { halfWidth: 3.65, rewardHalfWidth: 1.825, edgeZ: 6.8 };
export type ExitZone = 'reward' | 'recycle';
// A bead centred exactly on a divider belongs to the outer recovery zone.
export function classifyFrontExit(x: number): ExitZone {
  return Math.abs(x) < FRONT_EXIT.rewardHalfWidth ? 'reward' : 'recycle';
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








