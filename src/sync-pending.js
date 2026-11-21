const keyFor = uid => `garagem-pending-v1-${uid}`;

export function pendingWrites(uid) {
  if (!uid) return {};
  try { return JSON.parse(localStorage.getItem(keyFor(uid)) || '{}') || {}; }
  catch { return {}; }
}

function write(uid, entries) {
  try { localStorage.setItem(keyFor(uid), JSON.stringify(entries)); } catch { /* a cópia local continua disponível */ }
  return entries;
}

export function markPending(uid, id, updatedAt) {
  if (!uid) return;
  write(uid, { ...pendingWrites(uid), [id]: Number(updatedAt) || Date.now() });
}

export function clearPending(uid, id, through) {
  if (!uid) return;
  const entries = pendingWrites(uid);
  if (Number(entries[id]) <= through) delete entries[id];
  write(uid, entries);
}

export function clearSynced(uid, through) {
  if (!uid) return;
  const entries = pendingWrites(uid);
  for (const [id, stamp] of Object.entries(entries)) {
    if (Number(stamp) <= through) delete entries[id];
  }
  write(uid, entries);
}

export function hasPending(uid) {
  return Object.keys(pendingWrites(uid)).length > 0;
}
