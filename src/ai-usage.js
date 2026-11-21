const keyFor = uid => `garagem-ai-usage-v1-${uid || 'local'}`;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function readAiUsage(uid) {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(keyFor(uid)) || '{}') || {}; } catch { /* armazenamento indisponível */ }
  const budget = Number(stored.budget);
  return {
    day: today(),
    attempts: stored.day === today() ? Math.max(0, Number(stored.attempts) || 0) : 0,
    budget: Number.isInteger(budget) && budget > 0 ? budget : 0,
    limited: stored.day === today() && stored.limited === true
  };
}

function writeAiUsage(uid, usage) {
  try { localStorage.setItem(keyFor(uid), JSON.stringify(usage)); } catch { /* a IA continua utilizável */ }
  return usage;
}

export function countAiAttempt(uid) {
  const usage = readAiUsage(uid);
  return writeAiUsage(uid, { ...usage, attempts: usage.attempts + 1 });
}

export function setAiBudget(uid, value) {
  const usage = readAiUsage(uid);
  const number = Number(value);
  return writeAiUsage(uid, { ...usage, budget: Number.isInteger(number) && number >= 1 && number <= 10000 ? number : 0 });
}

export function markAiLimited(uid) {
  return writeAiUsage(uid, { ...readAiUsage(uid), limited: true });
}
