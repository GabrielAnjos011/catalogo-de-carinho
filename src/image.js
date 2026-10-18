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

export async function recognizePhoto(dataUrl, onProgress) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: message => {
      if (message.status === 'recognizing text') onProgress?.(Math.round(message.progress * 100));
    }
  });
  try {
    const { data } = await worker.recognize(dataUrl);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
