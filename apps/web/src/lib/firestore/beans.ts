import type { Bean } from '@fazole/common';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';

import { db } from '../firebase';

const beansRef = collection(db, 'beans');

// Filtering, sorting, and pagination happen client-side (see lib/beans-select)
// so the freely-combinable bean filters don't require a composite index per
// combination. This fetches every non-deleted bean in one indexless query.
export async function fetchAllBeans(): Promise<Bean[]> {
  const snap = await getDocs(query(beansRef, where('deletedAt', '==', null)));
  const beans = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bean);
  return beans.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchBean(id: string): Promise<Bean> {
  const snap = await getDoc(doc(db, 'beans', id));
  if (!snap.exists()) throw new Error(`Bean ${id} not found`);
  return { id: snap.id, ...snap.data() } as Bean;
}

export async function createBean(data: Omit<Bean, 'id' | 'createdAt' | 'updatedAt' | 'yearsGrown'>): Promise<string> {
  const docRef = await addDoc(beansRef, {
    ...data,
    yearsGrown: [],
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateBean(id: string, data: Partial<Bean>): Promise<void> {
  await updateDoc(doc(db, 'beans', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteBean(id: string): Promise<void> {
  await updateDoc(doc(db, 'beans', id), {
    deletedAt: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreBean(id: string): Promise<void> {
  await updateDoc(doc(db, 'beans', id), {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}
