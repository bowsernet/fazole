import type { Bean, BeanColor, BeanSpecies, PlantType, PodType } from '@fazole/common';
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

const beansRef = collection(db, 'beans');

interface FetchBeansFilters {
  species?: BeanSpecies;
  podType?: PodType;
  plantType?: PlantType;
  yearGrown?: number;
  beanColor?: BeanColor;
  sourceId?: string;
}

interface FetchBeansOptions {
  filters?: FetchBeansFilters;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
}

export async function fetchBeans(options: FetchBeansOptions = {}): Promise<{ beans: Bean[]; total: number }> {
  const { filters = {}, sortField = 'name', sortDir = 'asc', page = 1 } = options;

  const constraints: QueryConstraint[] = [where('deletedAt', '==', null)];

  if (filters.species) constraints.push(where('species', '==', filters.species));
  if (filters.podType) constraints.push(where('podType', '==', filters.podType));
  if (filters.plantType) constraints.push(where('plantType', '==', filters.plantType));
  if (filters.yearGrown) constraints.push(where('yearsGrown', 'array-contains', filters.yearGrown));
  if (filters.beanColor) constraints.push(where('beanColor1', '==', filters.beanColor));
  if (filters.sourceId) constraints.push(where('sourceId', '==', filters.sourceId));

  const countSnap = await getCountFromServer(query(beansRef, ...constraints));
  const total = countSnap.data().count;

  constraints.push(orderBy(sortField, sortDir));
  constraints.push(limit(PAGINATION_PAGE_SIZE));

  if (page > 1) {
    const skipQuery = query(beansRef, ...constraints.slice(0, -1), limit((page - 1) * PAGINATION_PAGE_SIZE));
    const skipSnap = await getDocs(skipQuery);
    const lastDoc = skipSnap.docs[skipSnap.docs.length - 1];
    if (lastDoc) constraints.push(startAfter(lastDoc));
  }

  const snap = await getDocs(query(beansRef, ...constraints));
  const beans = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bean);

  return { beans, total };
}

export async function fetchAllBeans(): Promise<Bean[]> {
  const snap = await getDocs(query(beansRef, where('deletedAt', '==', null), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bean);
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
