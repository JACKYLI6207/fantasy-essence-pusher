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
    description: '一座雙倍寬連體金庫：雙龍頭出幣口、雙球道、雙拉霸，下方幣池與接幣口互通。',
    image: 'machine.png',
    entryCost: 1,
    layout: 'dual' as const,
  },
] as const;

export type MachineId = (typeof MACHINES)[number]['id'];
export type MachineLayout = (typeof MACHINES)[number]['layout'];

export function getMachine(id: MachineId) {
  return MACHINES.find((m) => m.id === id)!;
}
