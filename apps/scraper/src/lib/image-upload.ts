import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

import { bucket, db } from './admin';

export function fileHash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export async function uploadSourceImage(beanId: string, localPath: string): Promise<void> {
  if (!existsSync(localPath)) return;
  const ext = (extname(localPath).replace('.', '') || 'jpg').toLowerCase();
  const storagePath = `beans/${beanId}/images/source.${ext}`;
  const imageRef = db().collection('beans').doc(beanId).collection('images').doc('source');
  const snap = await imageRef.get();
  const now = Date.now();

  await imageRef.set(
    {
      type: 'source',
      primary: true,
      paths: {},
      urls: {},
      originalPath: storagePath,
      updatedAt: now,
      ...(snap.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  await bucket().upload(localPath, {
    destination: storagePath,
    metadata: { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` },
  });
}
