import type { Origin, PageRef } from './types';

const BASE = 'https://www.abeancollectorswindow.com';

function beanPages(): PageRef[] {
  // beanpage.html, beanpage1.html ... beanpage7.html
  return Array.from({ length: 8 }, (_, i) => ({
    url: `${BASE}/beanpage${i === 0 ? '' : i}.html`,
    origin: 'bean' as Origin,
    pageId: `bean-${i}`,
  }));
}

function networkPages(): PageRef[] {
  // networkpage1.html ... networkpage11.html
  return Array.from({ length: 11 }, (_, i) => ({
    url: `${BASE}/networkpage${i + 1}.html`,
    origin: 'network' as Origin,
    pageId: `network-${i + 1}`,
  }));
}

export function buildPageRefs(which: 'bean' | 'network' | 'all'): PageRef[] {
  if (which === 'bean') return beanPages();
  if (which === 'network') return networkPages();
  return [...beanPages(), ...networkPages()];
}
