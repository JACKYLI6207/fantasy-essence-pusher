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
    tag: '奇幻冒險 · 雙球道 × 雙龍頭 × 雙 SLOT',
    description: '左右兩套原尺寸球道與龍頭，雙拉霸；下方幣池互通、接幣口連成兩倍寬。',
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
