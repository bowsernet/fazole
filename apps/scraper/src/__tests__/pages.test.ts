import { describe, expect, it } from 'vitest';

import { buildPageRefs } from '../lib/pages';

describe('buildPageRefs', () => {
  it('builds 8 bean pages with correct ids and urls', () => {
    const beans = buildPageRefs('bean');
    expect(beans).toHaveLength(8);
    expect(beans[0]).toEqual({
      url: 'https://www.abeancollectorswindow.com/beanpage.html',
      origin: 'bean',
      pageId: 'bean-0',
    });
    expect(beans[7]).toEqual({
      url: 'https://www.abeancollectorswindow.com/beanpage7.html',
      origin: 'bean',
      pageId: 'bean-7',
    });
  });

  it('builds 11 network pages starting at 1', () => {
    const net = buildPageRefs('network');
    expect(net).toHaveLength(11);
    expect(net[0]).toEqual({
      url: 'https://www.abeancollectorswindow.com/networkpage1.html',
      origin: 'network',
      pageId: 'network-1',
    });
    expect(net[10]?.pageId).toBe('network-11');
  });

  it('returns all 19 pages for "all"', () => {
    expect(buildPageRefs('all')).toHaveLength(19);
  });
});
