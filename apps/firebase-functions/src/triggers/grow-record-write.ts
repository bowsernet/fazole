import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { FIREBASE_REGION } from '@fazole/config';

export const onGrowRecordWrite = onDocumentWritten(
  { document: 'growRecords/{recordId}', region: FIREBASE_REGION },
  async (event) => {
    const db = getFirestore();
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    const beanIds = new Set<string>();
    if (before?.beanId) beanIds.add(before.beanId);
    if (after?.beanId) beanIds.add(after.beanId);

    for (const beanId of beanIds) {
      const recordsSnap = await db
        .collection('growRecords')
        .where('beanId', '==', beanId)
        .where('deletedAt', '==', null)
        .get();

      const years = [...new Set(recordsSnap.docs.map((d) => d.data().year))].sort();

      await db.collection('beans').doc(beanId).update({
        yearsGrown: years,
        updatedAt: Date.now(),
      });
    }
  }
);
