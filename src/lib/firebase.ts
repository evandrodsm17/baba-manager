import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { UserProfile } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase ainda não foi configurado.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}

export function watchAuth(callback: (user: User | null) => void) {
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, callback);
}

export async function resolveUserProfile(user: User): Promise<UserProfile> {
  if (!db || !user.email) throw new Error('Não foi possível identificar o usuário.');

  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return existing.data() as UserProfile;

  const email = user.email.trim().toLowerCase();
  const invite = await getDoc(doc(db, 'managerInvites', email));
  let role: UserProfile['role'] = 'player';
  let organizationId: string | undefined;
  let playerId: string | undefined;

  if (invite.exists() && invite.data().status !== 'disabled') {
    role = 'manager';
    organizationId = invite.data().organizationId;
    await setDoc(invite.ref, { ...invite.data(), status: 'accepted', lastAccess: new Date().toISOString() });
  } else {
    const linkedPlayers = await getDocs(
      query(collection(db, 'players'), where('email', '==', email), limit(1)),
    );
    const linkedPlayer = linkedPlayers.docs[0];
    if (linkedPlayer) {
      organizationId = linkedPlayer.data().organizationId;
      playerId = linkedPlayer.id;
    }
  }

  const profile: UserProfile = {
    id: user.uid,
    uid: user.uid,
    name: user.displayName || email.split('@')[0],
    email,
    photoUrl: user.photoURL || undefined,
    role,
    organizationId,
    playerId,
    active: true,
    lastAccess: new Date().toISOString(),
  };

  await setDoc(userRef, profile);
  return profile;
}
