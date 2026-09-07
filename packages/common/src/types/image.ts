import type { ImageFormat, ImagePresetKey } from '@fazole/config';

export type ImageType = 'source' | 'closeup' | 'bunch' | 'seedling' | 'flower' | 'pod' | 'plant';

export interface BeanImage {
  id: string;
  type: ImageType;
  year?: number | null;
  primary: boolean;
  paths: Partial<Record<`${ImagePresetKey}_${ImageFormat}`, string>>;
  urls: Partial<Record<`${ImagePresetKey}_${ImageFormat}`, string>>;
  originalPath: string;
  createdAt: number;
  updatedAt: number;
}
