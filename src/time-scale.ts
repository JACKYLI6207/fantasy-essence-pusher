const STORAGE_KEY = 'fantasy-arcade-time-scale';
export const TIME_SCALE_MIN = 0.01;
export const TIME_SCALE_MAX = 1000;
export const TIME_SCALE_PRESETS = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100] as const;

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

/** 避免極高倍速時單幀物理步數過多造成卡死。 */
export function maxPhysicsStepsPerFrame(scale: number): number {
  return Math.min(900, Math.max(12, Math.ceil(scale * 24)));
}
