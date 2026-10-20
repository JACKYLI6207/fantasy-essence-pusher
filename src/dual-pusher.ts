import type {CoinPusher} from './physics.ts';
import {CascadePusher,isCascadeGame} from './cascade-pusher.ts';
import {CONFIG} from './config.ts';

export type ActiveGame = CoinPusher | CascadePusher;
export {isCascadeGame};

export function isWideGame(game: ActiveGame): boolean {
  return game.widthScale > 1;
}

/** @deprecated 改用 isWideGame */
export function isDualGame(game: ActiveGame): boolean {
  return isWideGame(game);
}

export function gameCoinCount(game: ActiveGame) {
  if (isCascadeGame(game)) return game.upper.coins.length + game.lower.coins.length;
  return game.coins.length;
}

export function gameCanDrop(game: ActiveGame) {
  if (game.gold < CONFIG.essenceCost) return false;
  const target = isCascadeGame(game) ? game.upper : game;
  if (target.time - target.lastDrop + 1e-9 < CONFIG.dropCooldown) return false;
  return target.coins.length < target.maxCoins;
}
