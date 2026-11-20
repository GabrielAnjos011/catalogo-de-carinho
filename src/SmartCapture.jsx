import React, { useRef, useState } from 'react';
import { Camera, Check, ChevronRight, Search, ScanLine, ZoomIn } from 'lucide-react';
import { compressPhoto, recognizePhoto } from './image';
import { findByProductCode, identifyFromReadings } from './identify';
import { searchReleases } from './catalog';

export default function SmartCapture({ form, onSet, onPickRelease, notify }) {
  const frontInput = useRef(null);
  const backInput = useRef(null);
  const originals = useRef({});
  const ocrResults = useRef([]);
  const [code, setCode] = useState(form.code || '');
  const [name, setName] = useState('');
  const [reading, setReading] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const aiReady = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY);

  async function capture(file, side) {
    if (!file) return;
    try {
      const photo = await compressPhoto(file);
      originals.current[side] = file;
      originals.current.detail = null;
      ocrResults.current = [];
      onSet(side === 'front' ? 'photo' : 'backPhoto', photo);
      setReading(null);
      notify(side === 'front' ? 'Frente adicionada. Agora fotografe o verso.' : 'Verso adicionado. Já pode identificar na biblioteca.');
    } catch (error) { notify(error.message); }
    const input = side === 'front' ? frontInput : backInput;
    if (input.current) input.current.value = '';
  }

  async function identify(detailFile) {
    const front = originals.current.front || form.photo;
    const back = originals.current.back || form.backPhoto;
    if (!front && !back && !detailFile) return;
    if (detailFile) originals.current.detail = detailFile;
    setBusy(true); setProgress(0); setReading(null);
    setCode(''); setName('');
    const results = [];
    const zones = detailFile ? [[detailFile, undefined]] : [
      ...(front ? [[front, { x: 0.04, y: 0.72, width: 0.92, height: 0.28 }]] : []),
      ...(back ? [
        [back, { x: 0.03, y: 0.1, width: 0.94, height: 0.31 }],
        [back, { x: 0.22, y: 0.1, width: 0.5, height: 0.13 }]
      ] : [])
    ];
    try {
      for (let i = 0; i < zones.length; i += 1) {
        const [image, region] = zones[i];
        const result = await recognizePhoto(image, value => setProgress(Math.round((i * 100 + value) / zones.length)), region);
        results.push(result);
      }
      ocrResults.current = detailFile ? [...ocrResults.current, ...results] : results;
      setReading(identifyFromReadings(ocrResults.current));
    } catch (error) {
      setReading({ candidates: [], raw: '', error: 'Não foi possível carregar a leitura local. Confira a conexão e tente novamente.', technical: error.message });
    } finally { setBusy(false); setProgress(100); }
  }

  async function identifyWithAI() {
    setAiBusy(true); setReading(null); setCode(''); setName('');
    try {
      const { analyzePackagingWithAI } = await import('./ai');
      setReading(await analyzePackagingWithAI({
        front: originals.current.front || form.photo,
        back: originals.current.back || form.backPhoto,
        detail: originals.current.detail
      }));
    } catch (error) {
      setReading({ candidates: [], raw: '', error: 'A IA não conseguiu analisar agora. A busca por código e a leitura local continuam disponíveis.', technical: error.message });
    } finally { setAiBusy(false); }
  }

  const codeMatches = findByProductCode(code);
  const nameMatches = name.trim().length >= 4 ? searchReleases(name).slice(0, 8) : [];
  const candidates = code.trim() ? codeMatches.map(item => ({ item, code: true, name: false }))
    : name.trim() ? nameMatches.map(item => ({ item, code: false, name: true }))
      : reading?.candidates || [];

  return <section className="smart-capture" aria-label="Cadastro inteligente">
    <div className="smart-head"><span className="step-label">01 / IDENTIFICAR</span><h3>Encontre sua versão</h3><p>Escolha um resultado da biblioteca e preencha só os detalhes do seu carrinho. Se ele não aparecer, continue no formulário abaixo.</p></div>
    <div className="smart-code"><label htmlFor="product-code">Tem o código de 5 caracteres?</label><p>Fica no topo do verso, perto do gancho. No exemplo: <strong>JJM05</strong>. Não use os números do código de barras.</p><div><input id="product-code" value={code} onChange={event => { const value = event.target.value.toUpperCase().slice(0, 12); setCode(value); onSet('code', value); setName(''); }} autoCapitalize="characters" autoComplete="off" placeholder="Ex.: JJM05"/><Search size={19}/></div></div>
    <div className="smart-divider"><span>ou fotografe a embalagem</span></div>
    <div className="smart-photos">
      <div className="smart-photo"><span className="smart-number">1</span><div><strong>Frente inteira</strong><small>Enquadre o cartão todo. O nome fica na faixa abaixo do carrinho.</small></div><label htmlFor="smart-front" className={`smart-photo-action ${form.photo ? 'captured' : ''}`}>{form.photo ? <><Check size={17}/> Trocar</> : <><Camera size={17}/> Fotografar</>}</label>{form.photo && <button type="button" className="smart-thumb" onClick={() => setPreview('front')} aria-label="Ver foto da frente"><img src={form.photo} alt="Frente da embalagem"/><ZoomIn size={15}/></button>}</div>
      <div className="smart-photo"><span className="smart-number">2</span><div><strong>Verso inteiro</strong><small>Deixe legíveis o código no gancho e o nome logo abaixo.</small></div><label htmlFor="smart-back" className={`smart-photo-action ${form.backPhoto ? 'captured' : ''}`}>{form.backPhoto ? <><Check size={17}/> Trocar</> : <><Camera size={17}/> Fotografar</>}</label>{form.backPhoto && <button type="button" className="smart-thumb" onClick={() => setPreview('back')} aria-label="Ver foto do verso"><img src={form.backPhoto} alt="Verso da embalagem"/><ZoomIn size={15}/></button>}</div>
    </div>
    <input id="smart-front" ref={frontInput} type="file" accept="image/*" capture="environment" className="smart-file-input" onChange={event => capture(event.target.files?.[0], 'front')}/>
    <input id="smart-back" ref={backInput} type="file" accept="image/*" capture="environment" className="smart-file-input" onChange={event => capture(event.target.files?.[0], 'back')}/>
    <input id="smart-detail" type="file" accept="image/*" capture="environment" disabled={busy || aiBusy} className="smart-file-input" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) identify(file); }}/>
    <label htmlFor="smart-detail" className={`smart-closeup ${busy || aiBusy ? 'disabled' : ''}`}><Camera size={18}/><span><strong>Fotografar código ou nome de perto</strong><small>Opcional. Enquadre apenas o texto; esta foto não é guardada.</small></span><ChevronRight size={17}/></label>
    {(form.photo || form.backPhoto) && <button type="button" className="smart-read" disabled={busy || aiBusy} onClick={() => identify()}><ScanLine size={18}/>{busy ? `Lendo áreas importantes… ${progress}%` : 'Identificar pelas fotos'}</button>}
    {aiReady && (form.photo || form.backPhoto || originals.current.detail) && <button type="button" className="smart-ai" disabled={busy || aiBusy} onClick={identifyWithAI}>{aiBusy ? 'Analisando com IA…' : 'Analisar com IA gratuita'}<small>Envia estas fotos ao Google. Requer internet e pode atingir o limite gratuito.</small></button>}
    {reading && !code.trim() && !name.trim() && <div className="smart-feedback" role="status"><strong>{reading.candidates.length ? `Possíveis versões encontradas${reading.source === 'ai' ? ' pela IA' : ''}` : 'Ainda não encontrei uma versão segura'}</strong><p>{reading.error || (reading.candidates.length ? 'Confira o código, ano e série antes de escolher.' : 'Tente uma foto de perto ou digite o código de cinco caracteres.')}</p>{reading.codes?.length > 0 && <small>Códigos lidos: {reading.codes.join(', ')}</small>}{reading.hints?.model && <button type="button" onClick={() => onSet('model', reading.hints.model)}><Check size={16}/> Usar nome: {reading.hints.model}</button>}{reading.hints?.color && <button type="button" onClick={() => onSet('color', reading.hints.color)}><Check size={16}/> Usar cor sugerida: {reading.hints.color}</button>}{reading.technical && <details><summary>Ver detalhe do erro</summary><pre>{reading.technical}</pre></details>}{reading.raw && <details><summary>Ver texto identificado nas fotos</summary><pre>{reading.raw}</pre></details>}</div>}
    <div className="smart-name"><label htmlFor="model-search">Ou busque pelo nome</label><input id="model-search" type="search" value={name} onChange={event => { setName(event.target.value); setCode(''); }} placeholder="Ex.: 2016 Ford GT Race"/></div>
    {code.trim().length >= 5 && !codeMatches.length && <p className="smart-no-result">Código não encontrado nesta biblioteca. Confira as letras ou continue o cadastro manual.</p>}
    {candidates.length > 0 && <div className="smart-results"><span>{candidates.length} {candidates.length === 1 ? 'versão encontrada' : 'versões encontradas'}</span>{candidates.map(({ item, code: codeEvidence, name: nameEvidence, series, seriesNo }) => <button type="button" key={item.id} onClick={() => onPickRelease(item, { ...form, code: item.code })}><span><strong>{item.model}</strong><small>{item.year} · {item.series} · {item.code}{item.seriesNo ? ` · ${item.seriesNo}` : ''}</small>{codeEvidence && nameEvidence ? <em>Nome e código conferem</em> : nameEvidence && series && seriesNo ? <em>Nome, série e número conferem</em> : null}</span><ChevronRight size={19}/></button>)}</div>}
    <p className="smart-manual">Não achou? Preencha o modelo no formulário abaixo para cadastrar sem a biblioteca.</p>
    {preview && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={preview === 'front' ? 'Foto da frente ampliada' : 'Foto do verso ampliada'}><div className="photo-viewer-bar"><span>{preview === 'front' ? 'Frente' : 'Verso'} da embalagem</span><button type="button" onClick={() => setPreview(null)} aria-label="Fechar foto">×</button></div><img src={preview === 'front' ? form.photo : form.backPhoto} alt={preview === 'front' ? 'Frente da embalagem ampliada' : 'Verso da embalagem ampliada'}/></div>}
  </section>;
}
