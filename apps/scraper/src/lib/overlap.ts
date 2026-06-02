import type { Origin } from './types';

export interface OverlapReport {
  beanCount: number;
  networkCount: number;
  overlapCount: number;
  overlapNames: string[];
  overlapPctOfNetwork: number;
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function computeOverlap(beans: { name: string; origin: Origin }[]): OverlapReport {
  const beanNames = new Set<string>();
  const networkNames = new Set<string>();

  for (const { name, origin } of beans) {
    const key = normalize(name);
    if (!key) continue;
    (origin === 'bean' ? beanNames : networkNames).add(key);
  }

  const overlapNames = [...networkNames].filter((n) => beanNames.has(n)).sort();
  const overlapCount = overlapNames.length;

  return {
    beanCount: beanNames.size,
    networkCount: networkNames.size,
    overlapCount,
    overlapNames,
    overlapPctOfNetwork: networkNames.size === 0 ? 0 : (overlapCount / networkNames.size) * 100,
  };
}

export function formatOverlapReport(r: OverlapReport): string {
  const lines = [
    '# ABCW Bean/Network Overlap',
    '',
    `- Bean-page beans (distinct names): ${r.beanCount}`,
    `- Network-page beans (distinct names): ${r.networkCount}`,
    `- Overlap: ${r.overlapCount} (${r.overlapPctOfNetwork.toFixed(1)}% of network names also appear on bean pages)`,
    '',
    '## Overlapping names',
    '',
    ...(r.overlapNames.length ? r.overlapNames.map((n) => `- ${n}`) : ['(none)']),
    '',
  ];
  return lines.join('\n');
}
