import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { getFirestore } from 'firebase-admin/firestore';
import { FIREBASE_REGION } from '@fazole/config';

export const onBeforeUserCreated = beforeUserCreated(
  { region: FIREBASE_REGION },
  async (event) => {
    const db = getFirestore();
    const usersSnapshot = await db.collection('users').limit(1).get();
    const isFirstUser = usersSnapshot.empty;

    await db.collection('users').doc(event.data.uid).set({
      role: isFirstUser ? 'admin' : 'user',
      displayName: event.data.displayName || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
);
