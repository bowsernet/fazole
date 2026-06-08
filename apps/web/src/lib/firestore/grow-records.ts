import type { GrowRecord } from '@fazole/common';
import { PAGINATION_PAGE_SIZE } from '@fazole/config';
import {
  type QueryConstraint,
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase';
import { nullifyUndefined } from './nullify';

const growRecordsRef = collection(db, 'growRecords');

interface FetchGrowRecordsFilters {
  beanId?: string;
  year?: number;
}

interface FetchGrowRecordsOptions {
  filters?: FetchGrowRecordsFilters;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
}

export async function fetchGrowRecords(
  options: FetchGrowRecordsOptions = {}
): Promise<{ records: GrowRecord[]; total: number }> {
  const { filters = {}, sortField = 'year', sortDir = 'desc', page = 1 } = options;

  const constraints: QueryConstraint[] = [where('deletedAt', '==', null)];

  if (filters.beanId) constraints.push(where('beanId', '==', filters.beanId));
  if (filters.year) constraints.push(where('year', '==', filters.year));

  const countSnap = await getCountFromServer(query(growRecordsRef, ...constraints));
  const total = countSnap.data().count;

  constraints.push(orderBy(sortField, sortDir));
  constraints.push(limit(PAGINATION_PAGE_SIZE));

  if (page > 1) {
    const skipQuery = query(growRecordsRef, ...constraints.slice(0, -1), limit((page - 1) * PAGINATION_PAGE_SIZE));
    const skipSnap = await getDocs(skipQuery);
    const lastDoc = skipSnap.docs[skipSnap.docs.length - 1];
    if (lastDoc) constraints.push(startAfter(lastDoc));
  }

  const snap = await getDocs(query(growRecordsRef, ...constraints));
  const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GrowRecord);

  return { records, total };
}

export async function fetchGrowRecord(id: string): Promise<GrowRecord> {
  const snap = await getDoc(doc(db, 'growRecords', id));
  if (!snap.exists()) throw new Error(`GrowRecord ${id} not found`);
  return { id: snap.id, ...snap.data() } as GrowRecord;
}

export async function createGrowRecord(data: Omit<GrowRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const docRef = await addDoc(growRecordsRef, {
    ...nullifyUndefined(data),
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateGrowRecord(id: string, data: Partial<GrowRecord>): Promise<void> {
  await updateDoc(doc(db, 'growRecords', id), {
    ...nullifyUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteGrowRecord(id: string): Promise<void> {
  await updateDoc(doc(db, 'growRecords', id), {
    deletedAt: Date.now(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreGrowRecord(id: string): Promise<void> {
  await updateDoc(doc(db, 'growRecords', id), {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
}
