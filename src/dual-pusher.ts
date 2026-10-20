import type {CoinPusher} from './physics.ts';
import {CONFIG} from './config.ts';

/** 雙倍寬連體機（單一物理世界）；保留檔名以免大量改 import。 */
export type ActiveGame = CoinPusher;

export function isWideGame(game: ActiveGame): boolean {
  return game.widthScale > 1;
}

/** @deprecated 改用 isWideGame */
export function isDualGame(game: ActiveGame): boolean {
  return isWideGame(game);
}

export function gameCoinCount(game: ActiveGame) {
  return game.coins.length;
}

export function gameCanDrop(game: ActiveGame) {
  if (game.gold < CONFIG.essenceCost) return false;
  if (game.time - game.lastDrop + 1e-9 < CONFIG.dropCooldown) return false;
  return game.coins.length < game.maxCoins;
}
