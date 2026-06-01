import { FIREBASE_REGION } from '@fazole/config';
import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import firebaseJson from '../../../../firebase.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, FIREBASE_REGION);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  const { emulators } = firebaseJson;
  connectAuthEmulator(auth, `http://localhost:${emulators.auth.port}`);
  connectFirestoreEmulator(db, 'localhost', emulators.firestore.port);
  connectStorageEmulator(storage, 'localhost', emulators.storage.port);
  connectFunctionsEmulator(functions, 'localhost', emulators.functions.port);
}
