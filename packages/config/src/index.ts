export const FIREBASE_REGION = 'europe-west3';

export const PAGINATION_PAGE_SIZE = 50;

export const IMAGE_PRESETS = {
  card: { width: 640, height: 480, fit: 'cover' as const },
  full: { width: 2048, height: 2048, fit: 'inside' as const },
  thumb: { width: 160, height: 160, fit: 'cover' as const },
} as const;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;

export const IMAGE_FORMATS = ['webp', 'avif'] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
