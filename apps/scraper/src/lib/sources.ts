import type { Origin } from './types';

export interface SourceSeed {
  id: string;
  name: string;
  color: string;
  link: string;
  description: string;
}

export const ABCW_SOURCES: SourceSeed[] = [
  {
    id: 'abcw-beans',
    name: "A Bean Collector's Window — Beans",
    color: '#6b4f2a',
    link: 'https://www.abeancollectorswindow.com/',
    description: "Main bean catalog from A Bean Collector's Window.",
  },
  {
    id: 'abcw-network',
    name: "A Bean Collector's Window — Network",
    color: '#9c7a3c',
    link: 'https://www.abeancollectorswindow.com/',
    description: "Network collection (other collectors' beans) from A Bean Collector's Window.",
  },
];

export function sourceIdForOrigin(origin: Origin): string {
  return origin === 'bean' ? 'abcw-beans' : 'abcw-network';
}
