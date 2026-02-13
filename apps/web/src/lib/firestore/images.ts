import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';

import type { BeanImage, ImageType } from '@fazole/common';

import { db, storage } from '../firebase';

function imagesRef(beanId: string) {
  return collection(db, 'beans', beanId, 'images');
}

export async function fetchBeanImages(beanId: string): Promise<BeanImage[]> {
  const snap = await getDocs(query(imagesRef(beanId), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BeanImage);
}

export async function uploadBeanImage(
  beanId: string,
  file: File,
  metadata: { type: ImageType; year: number; primary: boolean },
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const docRef = await addDoc(imagesRef(beanId), {
    type: metadata.type,
    year: metadata.year,
    primary: metadata.primary,
    paths: {},
    urls: {},
    originalPath: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const storagePath = `beans/${beanId}/images/${docRef.id}.${ext}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);

  await updateDoc(doc(db, 'beans', beanId, 'images', docRef.id), {
    originalPath: storagePath,
  });

  return docRef.id;
}

export async function updateBeanImage(
  beanId: string,
  imageId: string,
  data: Partial<BeanImage>,
): Promise<void> {
  await updateDoc(doc(db, 'beans', beanId, 'images', imageId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBeanImage(beanId: string, imageId: string): Promise<void> {
  const imageDoc = doc(db, 'beans', beanId, 'images', imageId);
  const snap = await getDocs(query(collection(db, 'beans', beanId, 'images')));
  const imageData = snap.docs.find((d) => d.id === imageId)?.data() as BeanImage | undefined;

  if (imageData?.originalPath) {
    try {
      await deleteObject(ref(storage, imageData.originalPath));
    } catch {
      // Storage file may already be deleted
    }
  }

  await deleteDoc(imageDoc);
}
