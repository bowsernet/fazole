import type { Origin, PageRef } from './types';

const BASE = 'https://www.abeancollectorswindow.com';

function beanPages(): PageRef[] {
  // Page 1 is beanpage.html; pages 2-7 are beanpage2.html .. beanpage7.html.
  // (beanpage1.html does not exist.)
  return Array.from({ length: 7 }, (_, i) => {
    const n = i + 1; // 1..7
    return {
      url: `${BASE}/beanpage${n === 1 ? '' : n}.html`,
      origin: 'bean' as Origin,
      pageId: `bean-${n}`,
    };
  });
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
