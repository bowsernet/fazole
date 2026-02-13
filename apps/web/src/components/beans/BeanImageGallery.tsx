import { useState } from 'react';
import type { ReactElement } from 'react';

import { Carousel } from '@mantine/carousel';
import { Image, Modal } from '@mantine/core';

import type { BeanImage } from '@fazole/common';

interface BeanImageGalleryProps {
  images: BeanImage[];
}

export function BeanImageGallery({ images }: BeanImageGalleryProps): ReactElement | null {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <Carousel
        withIndicators
        height={400}
        slideSize="70%"
        slideGap="md"
        emblaOptions={{ loop: images.length > 1, align: 'start' }}
      >
        {images.map((img) => {
          const url = img.urls.full_webp ?? img.urls.card_webp;
          if (!url) return null;

          return (
            <Carousel.Slide key={img.id}>
              <Image
                src={url}
                height={400}
                fit="contain"
                alt=""
                style={{ cursor: 'pointer' }}
                onClick={() => setLightboxUrl(url)}
              />
            </Carousel.Slide>
          );
        })}
      </Carousel>

      <Modal opened={lightboxUrl !== null} onClose={() => setLightboxUrl(null)} size="xl" padding={0} withCloseButton>
        {lightboxUrl && <Image src={lightboxUrl} fit="contain" alt="" />}
      </Modal>
    </>
  );
}
