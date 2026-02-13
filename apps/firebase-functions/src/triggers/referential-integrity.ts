import { FIREBASE_REGION } from '@fazole/config';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

export const deleteSource = onCall({ region: FIREBASE_REGION }, async (request) => {
  const db = getFirestore();
  const { sourceId } = request.data;

  const beansSnap = await db.collection('beans').where('sourceId', '==', sourceId).limit(1).get();

  if (!beansSnap.empty) {
    throw new HttpsError('failed-precondition', 'Cannot delete source: beans reference this source');
  }

  await db.collection('sources').doc(sourceId).delete();
  return { success: true };
});

export const deleteBeanHard = onCall({ region: FIREBASE_REGION }, async (request) => {
  const db = getFirestore();
  const { beanId } = request.data;

  const recordsSnap = await db.collection('growRecords').where('beanId', '==', beanId).limit(1).get();

  if (!recordsSnap.empty) {
    throw new HttpsError('failed-precondition', 'Cannot hard-delete bean: grow records reference this bean');
  }

  await db.collection('beans').doc(beanId).delete();
  return { success: true };
});
