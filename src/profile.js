export const defaultProfile = { suffix: 'MelqueHW', color: '#147a52', updatedAt: 0 };
export const palette = [
  { name: 'Verde garagem', color: '#147a52' },
  { name: 'Azul pista', color: '#2463a5' },
  { name: 'Roxo noturno', color: '#7040a0' },
  { name: 'Vermelho corrida', color: '#b84035' },
  { name: 'Laranja clássico', color: '#a85016' },
  { name: 'Grafite', color: '#45515e' }
];

export function cleanSuffix(value) {
  return String(value || '').replace(/^garagem\s*/i, '').replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ').trim().slice(0, 18);
}

export function validColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value.toLowerCase() : defaultProfile.color;
}

const rgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
const hex = channels => `#${channels.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
const mix = (color, other, amount) => hex(rgb(color).map((part, index) => part * (1 - amount) + rgb(other)[index] * amount));
function luminance(color) {
  const channels = rgb(color).map(value => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function accessibleAccent(color) {
  let result = validColor(color);
  while ((1.05 / (luminance(result) + 0.05)) < 4.5) result = mix(result, '#000000', 0.1);
  return result;
}

const profileKey = uid => uid ? `garagem-profile-v1-${uid}` : 'garagem-profile-v1';

export function readProfile(uid = null) {
  try {
    const saved = JSON.parse(localStorage.getItem(profileKey(uid)) || 'null');
    return { ...defaultProfile, ...saved, suffix: cleanSuffix(saved?.suffix) || defaultProfile.suffix,
      color: validColor(saved?.color) };
  } catch { return { ...defaultProfile }; }
}

export function storeProfile(value, preserveTime = false, uid = null) {
  const profile = { suffix: cleanSuffix(value.suffix) || defaultProfile.suffix,
    color: validColor(value.color), updatedAt: preserveTime ? Number(value.updatedAt) || 0 : Date.now() };
  localStorage.setItem(profileKey(uid), JSON.stringify(profile));
  return profile;
}

export function applyProfile(profile) {
  const accent = accessibleAccent(profile.color);
  const root = document.documentElement;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-deep', mix(accent, '#091a14', 0.62));
  root.style.setProperty('--accent-ink', mix(accent, '#07130d', 0.77));
  root.style.setProperty('--accent-panel', mix(accent, '#10231a', 0.64));
  root.style.setProperty('--accent-soft', mix(accent, '#ffffff', 0.89));
  document.title = `Garagem${profile.suffix} — coleção de carrinhos`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', accent);
}
