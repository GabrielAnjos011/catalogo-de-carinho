export async function compressPhoto(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      bitmap = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Não foi possível abrir esta foto.'));
        image.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
  }
  const longest = 960;
  const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let quality = 0.72;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > 260_000 && quality > 0.3) {
    quality -= 0.1;
    result = canvas.toDataURL('image/jpeg', quality);
  }
  while (result.length > 260_000 && canvas.width > 400) {
    const copy = document.createElement('canvas');
    copy.width = Math.round(canvas.width * 0.8);
    copy.height = Math.round(canvas.height * 0.8);
    copy.getContext('2d').drawImage(canvas, 0, 0, copy.width, copy.height);
    canvas.width = copy.width;
    canvas.height = copy.height;
    canvas.getContext('2d').drawImage(copy, 0, 0, canvas.width, canvas.height);
    result = canvas.toDataURL('image/jpeg', 0.55);
  }
  if (result.length > 420_000) {
    throw new Error('A imagem ficou grande demais. Tente uma foto com menos detalhes.');
  }
  return result;
}

let workerPromise;
let progressListener;

async function prepareForOcr(image) {
  if (!(image instanceof Blob)) return image;
  let bitmap;
  try { bitmap = await createImageBitmap(image, { imageOrientation: 'from-image' }); }
  catch {
    const url = URL.createObjectURL(image);
    try {
      bitmap = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Não foi possível abrir a foto para leitura.'));
        element.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(2, 2200 / longest);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas;
}

async function getWorker() {
  if (!workerPromise) workerPromise = (async () => {
    const { createWorker, PSM } = await import('tesseract.js');
    const base = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.href).href;
    const worker = await createWorker('eng', 1, {
      workerPath: `${base}worker.min.js`, corePath: `${base}core`,
      langPath: base.slice(0, -1), workerBlobURL: false,
      logger: message => {
        if (message.status === 'recognizing text') progressListener?.(Math.round(message.progress * 100));
      }
    });
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    return worker;
  })().catch(error => { workerPromise = undefined; throw error; });
  return workerPromise;
}

export async function recognizePhoto(image, onProgress) {
  progressListener = onProgress;
  const worker = await getWorker();
  const prepared = await prepareForOcr(image);
  const { data } = await worker.recognize(prepared, {}, { text: true, blocks: true });
  const lines = (data.blocks || []).flatMap(block =>
    (block.paragraphs || []).flatMap(paragraph =>
      (paragraph.lines || []).map(line => ({ text: line.text, confidence: line.confidence }))));
  return { text: data.text || '', confidence: data.confidence, lines };
}
