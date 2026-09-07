import type { Source } from '@fazole/common';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from '../firebase';
import { nullifyUndefined } from './nullify';

const sourcesRef = collection(db, 'sources');

export async function fetchSources(): Promise<Source[]> {
  const snap = await getDocs(query(sourcesRef, orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Source);
}

export async function fetchSource(id: string): Promise<Source> {
  const snap = await getDoc(doc(db, 'sources', id));
  if (!snap.exists()) throw new Error(`Source ${id} not found`);
  return { id: snap.id, ...snap.data() } as Source;
}

export async function createSource(data: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(sourcesRef, {
    ...nullifyUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSource(
  id: string,
  data: Partial<Omit<Source, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'sources', id), {
    ...nullifyUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function callDeleteSource(sourceId: string): Promise<void> {
  const deleteSourceFn = httpsCallable(functions, 'deleteSource');
  await deleteSourceFn({ sourceId });
}
