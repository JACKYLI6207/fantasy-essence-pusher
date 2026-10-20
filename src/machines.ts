export const MACHINES = [
  {
    id: 'essence-vault',
    name: '秘境金庫',
    tag: '奇幻冒險 · 推珠 × SLOT',
    description: '讓精華穿越針陣，喚醒龍珠，開啟寶箱裡的命運。',
    image: 'machine.png',
    entryCost: 1,
    layout: 'single' as const,
  },
  {
    id: 'twin-fate',
    name: '雙命運殿',
    tag: '奇幻冒險 · 連體寬機 × 雙 SLOT',
    description: '一座雙倍寬連體金庫：幣池互通、單一出幣口與接幣口，中央雙拉霸各自運轉。',
    image: 'machine.png',
    entryCost: 1,
    layout: 'dual' as const,
  },
  {
    id: 'cascade-fate',
    name: '雙層命運殿',
    tag: '奇幻冒險 · 上下堆疊 × 回收落層',
    description: '上層如雙命運殿；左右回收坑的綠／金球落入下層接珠機。下層無移動綠幣出幣口。',
    image: 'machine.png',
    entryCost: 1,
    layout: 'cascade' as const,
  },
] as const;

export type MachineId = (typeof MACHINES)[number]['id'];
export type MachineLayout = (typeof MACHINES)[number]['layout'];

export function getMachine(id: MachineId) {
  return MACHINES.find((m) => m.id === id)!;
}
