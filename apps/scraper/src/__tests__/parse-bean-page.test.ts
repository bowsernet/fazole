import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseBeanPage } from '../lib/parse-bean-page';

const html = readFileSync(join(__dirname, 'fixtures/sample-page.html'), 'utf8');
const BASE = 'https://www.abeancollectorswindow.com/beanpage.html';

describe('parseBeanPage', () => {
  const beans = parseBeanPage(html, BASE);

  it('extracts only img.bean beans, ignoring decorative images', () => {
    expect(beans).toHaveLength(3);
  });

  it('parses name, slug, alt and packet', () => {
    expect(beans[0]?.name).toBe('Abundant Little Gem');
    expect(beans[0]?.slug).toBe('abundant-little');
    expect(beans[0]?.alt).toContain('pinto beans');
    expect(beans[0]?.packet).toBe('Packet Size 30 Seeds $5.00');
  });

  it('resolves relative image urls against the page url', () => {
    expect(beans[0]?.imageUrl).toBe('https://www.abeancollectorswindow.com/images/abundant-little.jpg');
    expect(beans[1]?.imageUrl).toBe('https://www.abeancollectorswindow.com/images4/king-of-the-garden.jpg');
  });

  it('keeps absolute image urls as-is', () => {
    expect(beans[2]?.imageUrl).toBe('https://www.abeancollectorswindow.com/images/scarlet-emperor.jpg');
  });

  it('captures the description paragraph, not the packet line', () => {
    expect(beans[0]?.rawDescription).toMatch(/^Bush\/Dry\./);
    expect(beans[0]?.rawDescription).not.toContain('Packet Size');
  });
});
