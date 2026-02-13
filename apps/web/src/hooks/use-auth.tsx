import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import type { User } from '@fazole/common';

import { auth, db } from '../lib/firebase';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        setUserDoc(snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null);
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logOut = async (): Promise<void> => {
    await signOut(auth);
  };

  const isAdmin = userDoc?.role === 'admin';

  return (
    <AuthContext value={{ firebaseUser, userDoc, loading, isAdmin, signInWithGoogle, logOut }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
