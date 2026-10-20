export const MACHINES=[{
  id:'essence-vault',name:'秘境金庫',tag:'奇幻冒險 · 推珠 × SLOT',
  description:'讓精華穿越針陣，喚醒龍珠，開啟寶箱裡的命運。',
  image:'machine.png',entryCost:1,
}] as const;
export type MachineId=typeof MACHINES[number]['id'];
