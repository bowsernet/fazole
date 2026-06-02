import { FieldValue } from 'firebase-admin/firestore';

import { db } from './admin';
import type { CsvBean } from './scrape-csv';
import { slugifyName } from './slug';
import { ABCW_SOURCES } from './sources';
import type { LlmFields } from './types';

export async function upsertSources(): Promise<void> {
  const now = Date.now();
  for (const s of ABCW_SOURCES) {
    const ref = db().collection('sources').doc(s.id);
    const snap = await ref.get();
    await ref.set(
      {
        name: s.name,
        color: s.color,
        link: s.link,
        description: s.description,
        updatedAt: now,
        ...(snap.exists ? {} : { createdAt: now }),
      },
      { merge: true }
    );
  }
}

export async function upsertBean(bean: CsvBean, fields: LlmFields, sourceId: string): Promise<string> {
  const id = slugifyName(bean.name);
  const ref = db().collection('beans').doc(id);
  const snap = await ref.get();
  const now = Date.now();

  const data: Record<string, unknown> = {
    name: bean.name,
    species: fields.species,
    plantType: fields.plantType,
    podType: fields.podType,
    beanColor1: fields.beanColors[0] ?? FieldValue.delete(),
    beanColor2: fields.beanColors[1] ?? FieldValue.delete(),
    beanColor3: fields.beanColors[2] ?? FieldValue.delete(),
    sourceId,
    sourceDescription: bean.rawDescription,
    updatedAt: now,
  };

  if (!snap.exists) {
    data.createdAt = now;
    data.yearsGrown = [];
  } else {
    // Clear soft-delete markers if the bean has reappeared.
    data.deletedInSource = FieldValue.delete();
    data.deletedAt = FieldValue.delete();
  }

  await ref.set(data, { merge: true });
  return id;
}

export async function listAbcwBeanIds(): Promise<string[]> {
  const snap = await db().collection('beans').where('sourceId', 'in', ['abcw-beans', 'abcw-network']).get();
  return snap.docs.map((d) => d.id);
}

export async function markDeletedInSource(ids: string[]): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db().batch();
    for (const id of ids.slice(i, i + 400)) {
      batch.update(db().collection('beans').doc(id), { deletedInSource: true, deletedAt: now, updatedAt: now });
    }
    await batch.commit();
  }
}
