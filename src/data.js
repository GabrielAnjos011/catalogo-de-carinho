import { openDB } from 'idb';

const DB_NAME = 'garagem-pocket-v1';
const STORE = 'cars';

const database = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE, { keyPath: 'id' });
  }
});

export async function allCars() {
  return (await (await database).getAll(STORE)).filter(car => !car.deleted);
}

export async function allRecords() {
  return (await database).getAll(STORE);
}

export async function putCar(car) {
  await (await database).put(STORE, car);
  return car;
}

export async function removeCar(car) {
  const removed = { ...car, deleted: true, updatedAt: Date.now() };
  await putCar(removed);
  return removed;
}

export async function importCars(records) {
  const db = await database;
  const tx = db.transaction(STORE, 'readwrite');
  for (const record of records) await tx.store.put(record);
  await tx.done;
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
