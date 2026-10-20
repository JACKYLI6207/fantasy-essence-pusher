import {CONFIG} from './config.ts';
export interface WalletStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export const WALLET_KEY='fantasy-arcade.wallet.v1';
export class PlayerWallet {
  private value=CONFIG.startingGold;
  private storage?:WalletStorage;
  constructor(storage?:WalletStorage) {
    this.storage=storage;
    try {
      const raw=storage?.getItem(WALLET_KEY);
      if(raw!==null&&raw!==undefined) {
        const data=JSON.parse(raw);
        if(data?.version===1&&Number.isSafeInteger(data.gold)&&data.gold>=0)this.value=data.gold;
      }
    } catch { /* Restricted storage and invalid data fall back to an in-memory wallet. */ }
    this.persist();
  }
  get gold(){return this.value;}
  setBalance(value:number) {
    if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Invalid coin balance');
    this.value=value;this.persist();
  }
  spend(amount:number) {
    if(!Number.isSafeInteger(amount)||amount<=0||this.value<amount)return false;
    this.setBalance(this.value-amount);return true;
  }
  credit(amount:number) {
    if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(this.value+amount))return false;
    this.setBalance(this.value+amount);return true;
  }
  private persist(){try{this.storage?.setItem(WALLET_KEY,JSON.stringify({version:1,gold:this.value}));}catch{/* Keep the session playable without browser storage. */}}
}
