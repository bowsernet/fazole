import { collection, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';

import type { User, UserRole } from '@fazole/common';

import { db } from '../firebase';

const usersRef = collection(db, 'users');

export async function fetchUsers(): Promise<User[]> {
  const snap = await getDocs(query(usersRef, orderBy('displayName')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
}

export async function fetchUser(id: string): Promise<User> {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) throw new Error(`User ${id} not found`);
  return { id: snap.id, ...snap.data() } as User;
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', id), { role });
}
