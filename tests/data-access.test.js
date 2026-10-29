import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';

test('coleção antiga vai só para a primeira conta e contas locais ficam separadas', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const { newCar, putCar, allCars, migrateLegacyCollection } = await import('../src/data.js');
  await putCar({ ...newCar(), model: 'Carrinho antigo' });
  await migrateLegacyCollection('conta-a');
  assert.deepEqual((await allCars('conta-a')).map(car => car.model), ['Carrinho antigo']);
  await migrateLegacyCollection('conta-b');
  assert.deepEqual(await allCars('conta-b'), []);
  await putCar({ ...newCar(), model: 'Carrinho da conta B' }, 'conta-b');
  assert.deepEqual((await allCars('conta-a')).map(car => car.model), ['Carrinho antigo']);
  assert.deepEqual((await allCars('conta-b')).map(car => car.model), ['Carrinho da conta B']);
  delete globalThis.localStorage;
});
