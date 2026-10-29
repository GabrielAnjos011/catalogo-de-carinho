import { copyFile, mkdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const destination = new URL('../public/ocr/', import.meta.url);
const core = new URL('core/', destination);
await mkdir(core, { recursive: true });

const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
  ...['tesseract-core', 'tesseract-core-simd', 'tesseract-core-lstm', 'tesseract-core-simd-lstm']
    .flatMap(name => ['wasm.js', 'wasm'].map(extension =>
      [`node_modules/tesseract.js-core/${name}.${extension}`, `core/${name}.${extension}`]))
];
for (const [source, target] of files) await copyFile(new URL(source, root), new URL(target, destination));
console.log('Arquivos de OCR disponíveis no próprio PWA.');
