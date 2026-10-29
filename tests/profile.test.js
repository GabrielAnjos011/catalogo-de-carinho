import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSuffix, accessibleAccent, validColor, readProfile, storeProfile } from '../src/profile.js';

test('nome mantém prefixo fixo e remove caracteres indevidos', () => {
  assert.equal(cleanSuffix('Garagem Melque HW!'), 'Melque HW');
  assert.equal(cleanSuffix('   Ana  123   '), 'Ana 123');
});

test('cor inválida volta ao padrão e cor clara ganha contraste', () => {
  assert.equal(validColor('red'), '#147a52');
  assert.notEqual(accessibleAccent('#ffff00'), '#ffff00');
  assert.equal(accessibleAccent('#147a52'), '#147a52');
});

test('nome e cor são separados por conta no mesmo aparelho', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  storeProfile({ suffix: 'Ana', color: '#2463a5' }, false, 'conta-a');
  storeProfile({ suffix: 'Bia', color: '#7040a0' }, false, 'conta-b');
  assert.equal(readProfile('conta-a').suffix, 'Ana');
  assert.equal(readProfile('conta-b').color, '#7040a0');
  assert.equal(readProfile().suffix, 'MelqueHW');
  delete globalThis.localStorage;
});
