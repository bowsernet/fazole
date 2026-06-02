import * as cheerio from 'cheerio';

import type { ParsedBean } from './types';

export function parseBeanPage(html: string, baseUrl: string): ParsedBean[] {
  const $ = cheerio.load(html);
  const beans: ParsedBean[] = [];

  $('img.bean').each((_, img) => {
    const $img = $(img);
    const src = $img.attr('src');
    if (!src) return;

    const $block = $img.closest('.imgtxtadjust');
    const name = $block.find('p.title').first().text().trim();
    if (!name) return;

    const packet = $block
      .find('p')
      .filter((_i, el) => /Packet Size/i.test($(el).text()))
      .first()
      .text()
      .trim();

    // Description = direct child <p> elements that are neither the title
    // nor the (nested) packet line.
    const rawDescription = $block
      .children('p')
      .not('.title')
      .filter((_i, el) => !/Packet Size/i.test($(el).text()))
      .map((_i, el) => $(el).text().replace(/\s+/g, ' ').trim())
      .get()
      .join('\n\n')
      .trim();

    beans.push({
      name,
      slug: slugFromSrc(src),
      imageUrl: new URL(src, baseUrl).href,
      alt: $img.attr('alt')?.trim() ?? '',
      packet,
      rawDescription,
    });
  });

  return beans;
}

function slugFromSrc(src: string): string {
  const file = src.split('/').pop() ?? '';
  return file.replace(/\.[^.]+$/, '');
}
