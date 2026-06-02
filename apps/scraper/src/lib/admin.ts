import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { type Storage, getStorage } from 'firebase-admin/storage';

export type Target = 'emulator' | 'prod';

const PROJECT_ID = 'fazole';
const STORAGE_BUCKET = process.env.SCRAPER_STORAGE_BUCKET ?? 'fazole.firebasestorage.app';
// Emulator ports mirror firebase.json.
const FIRESTORE_EMULATOR = '127.0.0.1:5043';
const STORAGE_EMULATOR = '127.0.0.1:5045';

export function initAdmin(target: Target): void {
  if (getApps().length > 0) return;
  if (target === 'emulator') {
    process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = STORAGE_EMULATOR;
    initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
  } else {
    initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET, credential: applicationDefault() });
  }
}

export function db(): Firestore {
  return getFirestore();
}

export function bucket(): ReturnType<Storage['bucket']> {
  return getStorage().bucket();
}
