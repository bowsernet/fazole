import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import * as path from 'path';
import { FIREBASE_REGION, IMAGE_PRESETS, IMAGE_FORMATS, ImagePresetKey, ImageFormat } from '@fazole/config';

const ORIGINAL_PATH_REGEX = /^beans\/([^/]+)\/images\/([^/_]+)\.[^.]+$/;

export const onImageUpload = onObjectFinalized(
  { region: FIREBASE_REGION },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath) return;

    const match = filePath.match(ORIGINAL_PATH_REGEX);
    if (!match) return;

    const beanId = match[1]!;
    const imageId = match[2]!;

    const bucket = getStorage().bucket(event.data.bucket);
    const originalFile = bucket.file(filePath);
    const [buffer] = await originalFile.download();

    const dir = path.dirname(filePath);
    const paths: Record<string, string> = {};
    const urls: Record<string, string> = {};

    const presetKeys = Object.keys(IMAGE_PRESETS) as ImagePresetKey[];

    for (const preset of presetKeys) {
      const { width, height, fit } = IMAGE_PRESETS[preset];

      for (const format of IMAGE_FORMATS) {
        const variantName = `${imageId}_${preset}.${format}`;
        const variantPath = `${dir}/${variantName}`;
        const key = `${preset}_${format}`;

        const processed = await sharp(buffer)
          .resize({ width, height, fit })
          .toFormat(format)
          .toBuffer();

        const variantFile = bucket.file(variantPath);
        await variantFile.save(processed, {
          contentType: `image/${format}`,
        });
        await variantFile.makePublic();

        paths[key] = variantPath;
        urls[key] = variantFile.publicUrl();
      }
    }

    const db = getFirestore();
    await db
      .collection('beans')
      .doc(beanId)
      .collection('images')
      .doc(imageId)
      .update({ paths, urls, updatedAt: Date.now() });
  }
);
