import { openDB } from 'idb';

const DB_NAME = 'garagem-pocket-v1';
const STORE = 'cars';

const database = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE, { keyPath: 'id' });
  }
});
const accountDatabases = new Map();

function databaseFor(uid) {
  if (!uid) return database;
  if (!accountDatabases.has(uid)) {
    accountDatabases.set(uid, openDB(`${DB_NAME}-${uid}`, 1, {
      upgrade(db) { db.createObjectStore(STORE, { keyPath: 'id' }); }
    }));
  }
  return accountDatabases.get(uid);
}

export async function allCars(uid) {
  return (await (await databaseFor(uid)).getAll(STORE)).filter(car => !car.deleted);
}

export async function allRecords(uid) {
  return (await databaseFor(uid)).getAll(STORE);
}

export async function putCar(car, uid) {
  await (await databaseFor(uid)).put(STORE, car);
  return car;
}

export async function removeCar(car, uid) {
  const removed = { ...car, deleted: true, updatedAt: Date.now() };
  await putCar(removed, uid);
  return removed;
}

export async function importCars(records, uid) {
  const db = await databaseFor(uid);
  const tx = db.transaction(STORE, 'readwrite');
  for (const record of records) await tx.store.put(record);
  await tx.done;
}

export async function migrateLegacyCollection(uid) {
  if (!uid || localStorage.getItem('garagem-legacy-owner-v1')) return;
  const legacy = await allRecords();
  if (legacy.length && !(await allRecords(uid)).length) await importCars(legacy, uid);
  localStorage.setItem('garagem-legacy-owner-v1', uid);
}

export function newCar() {
  return {
    id: makeId(),
    model: '', maker: 'Hot Wheels', series: '', year: '', color: '', code: '',
    condition: 'Lacrado', quantity: 1, location: '', notes: '', photo: '',
    createdAt: Date.now(), updatedAt: Date.now()
  };
}

function makeId() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
