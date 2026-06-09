import type { BeanImage } from '@fazole/common';

function preferredImage(images: BeanImage[]): BeanImage | undefined {
  const closeup = images.find((img) => img.type === 'closeup');
  const source = images.find((img) => img.type === 'source');
  return closeup ?? source ?? images[0];
}

export function getBeanThumbUrl(images: BeanImage[]): string | undefined {
  return preferredImage(images)?.urls.thumb_webp ?? undefined;
}

export function getBeanPreviewUrl(images: BeanImage[]): string | undefined {
  return preferredImage(images)?.urls.card_webp ?? undefined;
}
