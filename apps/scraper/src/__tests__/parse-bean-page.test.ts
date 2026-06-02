import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  it('asserts slugs for relative and absolute image sources', () => {
    expect(beans[1]?.slug).toBe('king-of-the-garden');
    expect(beans[2]?.slug).toBe('scarlet-emperor');
  });

  it('skips an img.bean that has no title', () => {
    const noTitle = `
      <div class="imgtxtadjust">
        <img src="images/no-name.jpg" class="bean" alt="some beans" />
        <p>Bush/Dry. A description with no preceding title.</p>
      </div>`;
    expect(parseBeanPage(noTitle, BASE)).toHaveLength(0);
  });

  it('defaults alt to empty string when the attribute is absent', () => {
    const noAlt = `
      <div class="imgtxtadjust">
        <img src="images/no-alt.jpg" class="bean" />
        <p class="title">No Alt Bean</p>
        <p>Bush/Dry. No alt attribute here.</p>
      </div>`;
    expect(parseBeanPage(noAlt, BASE)[0]?.alt).toBe('');
  });

  it('never leaks the packet line into the description, even as a direct child', () => {
    const directPacket = `
      <div class="imgtxtadjust">
        <img src="images/direct.jpg" class="bean" alt="beans" />
        <p class="title">Direct Packet</p>
        <p>Packet Size 25 Seeds $5.00</p>
        <p>Bush/Dry. The real description.</p>
      </div>`;
    const [bean] = parseBeanPage(directPacket, BASE);
    expect(bean?.rawDescription).toBe('Bush/Dry. The real description.');
    expect(bean?.rawDescription).not.toContain('Packet Size');
  });

  it('collapses mid-paragraph source newlines into single spaces', () => {
    const wrapped = `
      <div class="imgtxtadjust">
        <img src="images/wrapped.jpg" class="bean" alt="beans" />
        <p class="title">Wrapped Bean</p>
        <p>Bush/Dry. A robust variety\n        that wraps across lines\n        in the source HTML.</p>
      </div>`;
    const [bean] = parseBeanPage(wrapped, BASE);
    expect(bean?.rawDescription).toBe('Bush/Dry. A robust variety that wraps across lines in the source HTML.');
    expect(bean?.rawDescription).not.toContain('\n');
  });
});
