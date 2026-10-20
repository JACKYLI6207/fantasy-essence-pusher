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
    tag: '奇幻冒險 · 雙機 × 雙 SLOT',
    description: '並聯兩座金庫，寬幅盤面與雙拉霸同步運轉，命運加倍開展。',
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
