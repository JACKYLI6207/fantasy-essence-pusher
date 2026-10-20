const STORAGE_KEY = 'fantasy-arcade-time-scale';
export const TIME_SCALE_MIN = 0.01;
export const TIME_SCALE_MAX = 1000;
export const TIME_SCALE_PRESETS = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100] as const;

/** 基準物理步數預算；珠多或倍速高時會再下修。 */
export const PHYSICS_STEPS_BUDGET = 10;
export const MAX_PHYSICS_DT = 1 / 8;
export const MAX_ACCUMULATED_GAME_TIME = PHYSICS_STEPS_BUDGET * MAX_PHYSICS_DT;
export const UI_UPDATE_MS = 160;

function readStored(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 1;
    return normalizeTimeScale(Number(raw));
  } catch {
    return 1;
  }
}

export function normalizeTimeScale(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, value));
}

export function isPresetScale(scale: number, preset: number): boolean {
  return Math.abs(scale - preset) < 0.001;
}

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

export function planPhysicsFrame(
  desiredGameTime: number,
  baseStep: number,
  coinCount = 0,
  scale = 1,
): {dt: number; steps: number} {
  let budget = PHYSICS_STEPS_BUDGET;
  if (scale >= 20) budget = Math.min(budget, 6);
  else if (scale >= 5) budget = Math.min(budget, 8);
  if (coinCount > 250) budget = Math.min(budget, 5);
  else if (coinCount > 120) budget = Math.min(budget, 7);

  const maxAccum = budget * MAX_PHYSICS_DT;
  const capped = Math.min(Math.max(desiredGameTime, 0), maxAccum);
  if (capped < baseStep * 0.5) return {dt: baseStep, steps: 0};
  const idealSteps = Math.ceil(capped / baseStep);
  const steps = Math.min(budget, Math.max(1, idealSteps));
  const dt = Math.min(MAX_PHYSICS_DT, Math.max(baseStep, capped / steps));
  return {dt, steps};
}
