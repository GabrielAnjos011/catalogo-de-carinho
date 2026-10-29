import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocFromServer, getDocs, setDoc } from 'firebase/firestore';
import { allRecords, importCars } from './data';
import { readProfile, storeProfile } from './profile';

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
const approvalKey = uid => `garagem-approved-v1-${uid}`;

async function approvedUser(current) {
  try {
    const approval = await getDocFromServer(doc(firestore, 'approvedUsers', current.uid));
    const allowed = approval.exists() && approval.data().active === true;
    if (allowed) localStorage.setItem(approvalKey(current.uid), 'yes');
    else localStorage.removeItem(approvalKey(current.uid));
    return allowed;
  } catch (error) {
    if ((!navigator.onLine || ['unavailable', 'deadline-exceeded'].includes(error.code))
      && localStorage.getItem(approvalKey(current.uid)) === 'yes') return true;
    throw error;
  }
}

export function observeUser(callback) {
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, async current => {
    if (!current) { callback(null); return; }
    try {
      if (await approvedUser(current)) callback(current);
      else {
        callback(null, new Error('Esta conta ainda não foi aprovada para acessar a garagem.'));
        await signOut(auth);
      }
    } catch (error) { callback(null, error); }
  });
}

export async function login(email, password) {
  if (!auth) throw new Error('Firebase ainda não configurado.');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  try {
    if (!(await approvedUser(credential.user))) throw new Error('Esta conta ainda não foi aprovada para acessar a garagem.');
    return credential;
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export async function logout() {
  if (auth) await signOut(auth);
}

export async function refreshApproval() {
  if (!auth?.currentUser) return false;
  const allowed = await approvedUser(auth.currentUser);
  if (!allowed) await signOut(auth);
  return allowed;
}

function carCollection(uid) {
  return collection(firestore, 'users', uid, 'cars');
}

export async function syncCars(uid) {
  if (!uid || !navigator.onLine) throw new Error('Conecte-se à internet para sincronizar.');
  const local = await allRecords(uid);
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
  if (fromCloud.length) await importCars(fromCloud, uid);
  for (const car of toCloud) await setDoc(doc(carCollection(uid), car.id), car);
  return { downloaded: fromCloud.length, uploaded: toCloud.length };
}

export async function syncProfile(uid) {
  if (!uid || !navigator.onLine) return readProfile(uid);
  const reference = doc(firestore, 'users', uid);
  const remote = await getDoc(reference);
  const local = readProfile(uid);
  const saved = remote.exists() ? remote.data() : null;
  if (saved && Number(saved.updatedAt) > Number(local.updatedAt)) {
    return storeProfile({ ...saved, updatedAt: Number(saved.updatedAt) }, true, uid);
  }
  if (!saved || Number(local.updatedAt) > Number(saved.updatedAt)) await setDoc(reference, local);
  return local;
}
