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
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { UserAccess, UserProfile } from '../types';

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

const profileResolutions = new Map<string, Promise<UserProfile>>();

function profileForAccess(
  user: User,
  email: string,
  access: UserAccess,
  accesses: UserAccess[],
  isPlatformMaster: boolean,
  lastAccess: string,
): UserProfile {
  return {
    id: user.uid,
    uid: user.uid,
    name: user.displayName || email.split('@')[0],
    email,
    role: access.role,
    accesses,
    active: true,
    lastAccess,
    ...(user.photoURL ? { photoUrl: user.photoURL } : {}),
    ...(isPlatformMaster ? { platformRole: 'master' as const } : {}),
    ...(access.organizationId ? { organizationId: access.organizationId } : {}),
    ...(access.managerInviteId ? { managerInviteId: access.managerInviteId } : {}),
    ...(access.playerId ? { playerId: access.playerId } : {}),
  };
}

function storedProfile(profile: UserProfile) {
  const stored = { ...profile } as Partial<UserProfile>;
  delete stored.accesses;
  return stored;
}

async function resolveUserProfileOnce(user: User): Promise<UserProfile> {
  if (!db || !user.email) throw new Error('Não foi possível identificar o usuário.');

  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);
  const email = user.email.trim().toLowerCase();
  const existingData = existing.exists() ? existing.data() as Partial<UserProfile> : undefined;
  const token = await user.getIdTokenResult();
  const isPlatformMaster = token.claims.role === 'master'
    || existingData?.platformRole === 'master'
    || existingData?.role === 'master';

  const [linkedInvites, linkedPlayers] = await Promise.all([
    getDocs(query(collection(db, 'managerInvites'), where('email', '==', email))),
    getDocs(query(collection(db, 'players'), where('email', '==', email))),
  ]);

  const accesses: UserAccess[] = [];
  if (isPlatformMaster) accesses.push({ id: 'master', role: 'master' });

  linkedInvites.docs.forEach((invite) => {
    const inviteData = invite.data();
    if (inviteData.status === 'disabled') return;
    accesses.push({
      id: `manager:${invite.id}`,
      role: 'manager',
      organizationId: inviteData.organizationId,
      organizationName: inviteData.organizationName,
      managerInviteId: invite.id,
    });
  });

  linkedPlayers.docs.forEach((player) => {
    const playerData = player.data();
    accesses.push({
      id: `player:${player.id}`,
      role: 'player',
      organizationId: playerData.organizationId,
      organizationName: playerData.organizationName,
      playerId: player.id,
      playerName: playerData.name,
      teamId: playerData.teamId,
      teamName: playerData.teamName,
    });
  });

  if (!accesses.length) {
    throw new Error('Esta conta Google ainda não possui acesso ao BABA MANAGER.');
  }

  const rememberedAccessId = sessionStorage.getItem(`baba-active-access:${user.uid}`);
  const selectedAccess = accesses.find((access) => access.id === rememberedAccessId)
    || accesses.find((access) => (
      access.role === existingData?.role
      && access.organizationId === existingData?.organizationId
      && (
        access.role === 'master'
        || access.managerInviteId === existingData?.managerInviteId
        || access.playerId === existingData?.playerId
      )
    ))
    || accesses[0];

  const lastAccess = new Date().toISOString();
  const profile = profileForAccess(
    user,
    email,
    selectedAccess,
    accesses,
    isPlatformMaster,
    lastAccess,
  );

  await setDoc(userRef, storedProfile(profile));
  sessionStorage.setItem(`baba-active-access:${user.uid}`, selectedAccess.id);

  await Promise.all(linkedInvites.docs
    .filter((invite) => invite.data().status === 'pending')
    .map((invite) => updateDoc(invite.ref, { status: 'accepted', lastAccess })));

  return profile;
}

export function resolveUserProfile(user: User): Promise<UserProfile> {
  const pending = profileResolutions.get(user.uid);
  if (pending) return pending;

  const resolution = resolveUserProfileOnce(user).finally(() => {
    profileResolutions.delete(user.uid);
  });
  profileResolutions.set(user.uid, resolution);
  return resolution;
}

export async function activateUserAccess(profile: UserProfile, access: UserAccess) {
  if (!db || !auth?.currentUser) throw new Error('A sessão não está disponível.');
  if (!profile.accesses.some((item) => item.id === access.id)) {
    throw new Error('Este acesso não está disponível para sua conta.');
  }

  const nextProfile = profileForAccess(
    auth.currentUser,
    profile.email,
    access,
    profile.accesses,
    profile.platformRole === 'master',
    new Date().toISOString(),
  );
  await setDoc(doc(db, 'users', profile.uid), storedProfile(nextProfile));
  sessionStorage.setItem(`baba-active-access:${profile.uid}`, access.id);
  return nextProfile;
}
