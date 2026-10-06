export interface StatInput { base: number; iv: number; ev: number; level: number; nature?: number; }

const iv = (value: number) => Math.max(0, Math.min(31, Math.trunc(value)));
const ev = (value: number) => Math.max(0, Math.min(252, Math.trunc(value)));

export function calculateHpStat(input: StatInput): number {
  return Math.floor(((2 * input.base + iv(input.iv) + Math.floor(ev(input.ev) / 4)) * input.level) / 100) + input.level + 10;
}

export function calculateOtherStat(input: StatInput): number {
  const beforeNature = Math.floor(((2 * input.base + iv(input.iv) + Math.floor(ev(input.ev) / 4)) * input.level) / 100) + 5;
  // Integer percent like the cartridge (110 / 100 / 90) so e.g. 70 * 1.1 never lands on 76.99999.
  return Math.floor((beforeNature * Math.round((input.nature ?? 1) * 100)) / 100);
}
