const STORAGE_KEY = 'fantasy-arcade-time-scale';
export const TIME_SCALE_MIN = 0.01;
export const TIME_SCALE_MAX = 1000;
export const TIME_SCALE_PRESETS = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100] as const;

/** 單幀最多物理步數（固定預算，高倍速改加大 dt 而非狂跑步數）。 */
export const PHYSICS_STEPS_BUDGET = 16;
/** 高倍速時單步最大時間；再大容易穿模，約可撐到 ~100× 仍流暢。 */
export const MAX_PHYSICS_DT = 1 / 10;
/** 單幀最多推進的遊戲時間（步數×最大 dt），避免卡頓後一次補跑爆炸。 */
export const MAX_ACCUMULATED_GAME_TIME = PHYSICS_STEPS_BUDGET * MAX_PHYSICS_DT;
/** UI 更新節流（真實時間毫秒）。 */
export const UI_UPDATE_MS = 120;

function readStored(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 1;
    return normalizeTimeScale(Number(raw));
  } catch {
    return 1;
  }
}

/** 遊戲時間相對於真實時間的倍率（物理、SLOT、出幣口、冷卻皆同步加速）。 */
export function normalizeTimeScale(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, value));
}

export function isPresetScale(scale: number, preset: number): boolean {
  return Math.abs(scale - preset) < 0.001;
}

/** 0–100 對數對應 TIME_SCALE_MIN … TIME_SCALE_MAX */
export function scaleToSlider(scale: number): number {
  const logMin = Math.log10(TIME_SCALE_MIN);
  const logMax = Math.log10(TIME_SCALE_MAX);
  const log = Math.log10(normalizeTimeScale(scale));
  return ((log - logMin) / (logMax - logMin)) * 100;
}

export function sliderToScale(slider: number): number {
  const logMin = Math.log10(TIME_SCALE_MIN);
  const logMax = Math.log10(TIME_SCALE_MAX);
  const t = Math.max(0, Math.min(100, slider)) / 100;
  return normalizeTimeScale(10 ** (logMin + t * (logMax - logMin)));
}

let gameTimeScale = readStored();

export function getGameTimeScale(): number {
  return gameTimeScale;
}

export function setGameTimeScale(value: number): number {
  gameTimeScale = normalizeTimeScale(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, String(gameTimeScale));
  } catch {
    /* storage disabled */
  }
  return gameTimeScale;
}

export function formatTimeScale(scale: number): string {
  const text = scale >= 10 || scale < 1 ? scale.toFixed(2).replace(/\.?0+$/, '') : String(scale);
  return `${text}×`;
}

/**
 * 依欲推進的遊戲時間決定本幀物理步長與步數。
 * 高倍速：步數固定在預算內，加大 dt，避免 100× 時跑上百次 world.step。
 */
export function planPhysicsFrame(desiredGameTime: number, baseStep: number): {dt: number; steps: number} {
  const capped = Math.min(Math.max(desiredGameTime, 0), MAX_ACCUMULATED_GAME_TIME);
  if (capped < baseStep * 0.5) return {dt: baseStep, steps: 0};
  const idealSteps = Math.ceil(capped / baseStep);
  const steps = Math.min(PHYSICS_STEPS_BUDGET, Math.max(1, idealSteps));
  const dt = Math.min(MAX_PHYSICS_DT, Math.max(baseStep, capped / steps));
  return {dt, steps};
}
