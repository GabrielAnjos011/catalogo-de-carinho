import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { firebaseApp } from './cloud';
import { preparePhotoForAI } from './image';
import { identifyFromFields } from './identify';

const schema = Schema.object({ properties: {
  model: Schema.string(),
  code: Schema.string(),
  series: Schema.string(),
  seriesNo: Schema.string(),
  collectorNo: Schema.string(),
  color: Schema.string()
} });

const prompt = `Leia apenas os dados IMPRESSOS nestas fotos de embalagem Hot Wheels.
Retorne strings vazias para qualquer dado ilegível; não adivinhe.
model: nome do carrinho impresso na frente embaixo ou no topo do verso. Ignore tradução após a barra, como "/ COURSE".
code: código Mattel do produto com exatamente 3 letras e 2 algarismos, normalmente no gancho do verso. Ignore o sufixo após hífen, UPC/código de barras e código do sortimento.
series: nome da série/linha impresso na embalagem.
seriesNo: fração da série, como 8/10; não confunda com 124/250.
collectorNo: número antes de /250, se visível.
color: cor predominante do carrinho físico; se incerta, deixe vazia.
Não use ano de copyright ou o ano no nome do veículo como ano de lançamento. Responda apenas com os campos solicitados.`;

export async function analyzePackagingWithAI(images) {
  if (!firebaseApp || !import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY) {
    throw new Error('IA ainda não configurada. Configure Firebase AI Logic e App Check.');
  }
  if (!navigator.onLine) throw new Error('Conecte-se à internet para usar a IA. A leitura local continua disponível.');
  const sources = [images.front, images.back, images.detail].filter(Boolean);
  if (!sources.length) throw new Error('Adicione ao menos uma foto para analisar.');
  const parts = await Promise.all(sources.map(async image => {
    const dataUrl = await preparePhotoForAI(image);
    return { inlineData: { data: dataUrl.split(',')[1], mimeType: 'image/jpeg' } };
  }));
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    model: 'gemini-3.5-flash-lite',
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
  });
  const response = await model.generateContent([prompt, ...parts]);
  const fields = JSON.parse(response.response.text());
  return identifyFromFields(fields);
}
