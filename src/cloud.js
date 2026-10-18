import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { allRecords, importCars } from './data';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const cloudConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const app = cloudConfigured ? initializeApp(config) : null;
const auth = app ? getAuth(app) : null;
const firestore = app ? getFirestore(app) : null;

export function observeUser(callback) {
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

export async function login(email, password, register = false) {
  if (!auth) throw new Error('Firebase ainda não configurado.');
  return register ? createUserWithEmailAndPassword(auth, email, password) : signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  if (auth) await signOut(auth);
}

function carCollection(uid) {
  return collection(firestore, 'users', uid, 'cars');
}

export async function syncCars(uid) {
  if (!uid || !navigator.onLine) throw new Error('Conecte-se à internet para sincronizar.');
  const local = await allRecords();
  const remoteSnapshot = await getDocs(carCollection(uid));
  const remote = remoteSnapshot.docs.map(item => item.data());
  const localMap = new Map(local.map(car => [car.id, car]));
  const remoteMap = new Map(remote.map(car => [car.id, car]));
  const fromCloud = [];
  const toCloud = [];
  for (const car of remote) {
    const own = localMap.get(car.id);
    if (!own || car.updatedAt > own.updatedAt) fromCloud.push(car);
  }
  for (const car of local) {
    const other = remoteMap.get(car.id);
    if (!other || car.updatedAt > other.updatedAt) toCloud.push(car);
  }
  if (fromCloud.length) await importCars(fromCloud);
  for (const car of toCloud) await setDoc(doc(carCollection(uid), car.id), car);
  return { downloaded: fromCloud.length, uploaded: toCloud.length };
}
