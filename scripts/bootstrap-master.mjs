import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const emailIndex = process.argv.indexOf('--email');
const email = emailIndex >= 0 ? process.argv[emailIndex + 1]?.trim().toLowerCase() : '';

if (!email) {
  console.error('Uso: npm run bootstrap:master -- --email voce@gmail.com');
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

try {
  const user = await getAuth(app).getUserByEmail(email);
  await getAuth(app).setCustomUserClaims(user.uid, { role: 'master' });
  await getFirestore(app).doc(`users/${user.uid}`).set({
    id: user.uid,
    uid: user.uid,
    name: user.displayName || email.split('@')[0],
    email,
    photoUrl: user.photoURL || null,
    role: 'master',
    platformRole: 'master',
    active: true,
    lastAccess: new Date().toISOString(),
  }, { merge: true });
  console.log(`Master configurado com sucesso: ${email} (${user.uid})`);
} catch (error) {
  console.error('Não foi possível configurar o master.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
