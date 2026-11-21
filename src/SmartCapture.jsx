import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, ChevronRight, Search, ScanLine, ZoomIn } from 'lucide-react';
import { compressPhoto, recognizePhoto } from './image';
import { findByProductCode, identifyFromReadings } from './identify';
import { searchReleases } from './catalog';
import { ownedMatch } from './search';
import { countAiAttempt, markAiLimited, readAiUsage, setAiBudget } from './ai-usage';

export default function SmartCapture({ form, cars, uid, onSet, onPickRelease, onSelectOwned, onOwnedChange, notify }) {
  const frontInput = useRef(null);
  const backInput = useRef(null);
  const originals = useRef({});
  const ocrResults = useRef([]);
  const resultRef = useRef(null);
  const lastScroll = useRef('');
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState(form.code || '');
  const [name, setName] = useState('');
  const [reading, setReading] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [usage, setUsage] = useState(() => readAiUsage(uid));
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
    setBusy(true); setProgress(0); setReading(null); setCode(''); setName(''); onSet('code', '');
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
        results.push(await recognizePhoto(image, value => setProgress(Math.round((i * 100 + value) / zones.length)), region));
      }
      ocrResults.current = detailFile ? [...ocrResults.current, ...results] : results;
      setReading(identifyFromReadings(ocrResults.current));
    } catch (error) {
      setReading({ candidates: [], raw: '', error: 'Não foi possível carregar a leitura local. Confira a conexão e tente novamente.', technical: error.message });
    } finally { setBusy(false); setProgress(100); }
  }

  async function identifyWithAI() {
    if (!navigator.onLine) { notify('Conecte-se à internet para analisar com IA.'); return; }
    setAiBusy(true); setReading(null); setCode(''); setName(''); onSet('code', '');
    setUsage(countAiAttempt(uid));
    try {
      const { analyzePackagingWithAI } = await import('./ai');
      setReading(await analyzePackagingWithAI({
        front: originals.current.front || form.photo,
        back: originals.current.back || form.backPhoto,
        detail: originals.current.detail
      }));
    } catch (error) {
      if (/429|quota|resource.exhausted/i.test(error.message)) setUsage(markAiLimited(uid));
      setReading({ candidates: [], raw: '', error: 'A IA não conseguiu analisar agora. A busca por código e a leitura local continuam disponíveis.', technical: error.message });
    } finally { setAiBusy(false); }
  }

  const codeMatches = findByProductCode(code);
  const nameMatches = name.trim().length >= 4 ? searchReleases(name).slice(0, 8) : [];
  const candidates = code.trim() ? codeMatches.map(item => ({ item, code: true, name: false }))
    : name.trim() ? nameMatches.map(item => ({ item, code: false, name: true }))
      : reading?.candidates || [];
  const directOwned = code.trim() ? ownedMatch(cars, { code }) : null;
  const readOwned = !code.trim() && !name.trim() && reading
    ? ownedMatch(cars, { code: reading.hints?.code || (reading.codes?.length === 1 ? reading.codes[0] : '') })
      || (reading.candidates.length === 1 ? ownedMatch(cars, {
        catalogId: reading.candidates[0].item.id, code: reading.candidates[0].item.code
      }) : null)
    : null;
  const existing = directOwned || readOwned;

  useEffect(() => { onOwnedChange(existing); }, [existing?.id]);
  useEffect(() => {
    const key = code.trim().length >= 5 ? `code:${code}` : name.trim().length >= 4 ? `name:${name}`
      : reading ? `reading:${reading.raw || reading.error}` : '';
    if (!key || key === lastScroll.current) return;
    lastScroll.current = key;
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [code, name, reading]);

  const applyHint = (field, value) => {
    onSet(field, value);
    if (field === 'code') { setCode(value); setMode('code'); }
  };
  const hints = reading?.source === 'ai' ? [
    ['model', 'nome'], ['code', 'código'], ['series', 'série'],
    ['seriesNo', 'nº da série'], ['collectorNo', 'nº de coleção'], ['color', 'cor']
  ].filter(([field]) => reading.hints?.[field]) : [];
  const hasOutcome = Boolean(existing || reading || candidates.length || code.trim().length >= 5);

  return <section className="smart-capture" aria-label="Cadastro inteligente">
    <div className="smart-head"><span className="step-label">01 / IDENTIFICAR</span><h3>Encontre sua versão</h3><p>Escolha como quer procurar. Depois, confira o resultado antes de cadastrar.</p></div>
    <div className="smart-methods" role="group" aria-label="Forma de identificação">
      {[['code', 'Pelo código'], ['photos', 'Pelas fotos'], ['name', 'Pelo nome']].map(([value, label]) =>
        <button type="button" key={value} className={mode === value ? 'active' : ''} aria-expanded={mode === value}
          onClick={() => setMode(current => current === value ? null : value)}>{label}</button>)}
    </div>
    {mode === 'code' && <div className="smart-code"><label htmlFor="product-code">Código de 5 caracteres</label><p>Fica perto do gancho, no verso. Ex.: <strong>JJM05</strong>. Não é o código de barras.</p><div><input id="product-code" value={code} onChange={event => { const value = event.target.value.toUpperCase().slice(0, 12); setCode(value); onSet('code', value); setName(''); }} autoCapitalize="characters" autoComplete="off" placeholder="Ex.: JJM05"/><Search size={19}/></div></div>}
    {mode === 'photos' && <>
      <div className="smart-photos">
        <div className="smart-photo"><span className="smart-number">1</span><div><strong>Frente inteira</strong><small>Enquadre o cartão todo. O nome fica abaixo do carrinho.</small></div><label htmlFor="smart-front" className={`smart-photo-action ${form.photo ? 'captured' : ''}`}>{form.photo ? <><Check size={17}/> Trocar</> : <><Camera size={17}/> Fotografar</>}</label>{form.photo && <button type="button" className="smart-thumb" onClick={() => setPreview('front')} aria-label="Ver foto da frente"><img src={form.photo} alt="Frente da embalagem"/><ZoomIn size={15}/></button>}</div>
        <div className="smart-photo"><span className="smart-number">2</span><div><strong>Verso inteiro</strong><small>Deixe legíveis o código e o nome perto do gancho.</small></div><label htmlFor="smart-back" className={`smart-photo-action ${form.backPhoto ? 'captured' : ''}`}>{form.backPhoto ? <><Check size={17}/> Trocar</> : <><Camera size={17}/> Fotografar</>}</label>{form.backPhoto && <button type="button" className="smart-thumb" onClick={() => setPreview('back')} aria-label="Ver foto do verso"><img src={form.backPhoto} alt="Verso da embalagem"/><ZoomIn size={15}/></button>}</div>
      </div>
      <input id="smart-front" ref={frontInput} type="file" accept="image/*" capture="environment" className="smart-file-input" onChange={event => capture(event.target.files?.[0], 'front')}/>
      <input id="smart-back" ref={backInput} type="file" accept="image/*" capture="environment" className="smart-file-input" onChange={event => capture(event.target.files?.[0], 'back')}/>
      <input id="smart-detail" type="file" accept="image/*" capture="environment" disabled={busy || aiBusy} className="smart-file-input" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) identify(file); }}/>
      <label htmlFor="smart-detail" className={`smart-closeup ${busy || aiBusy ? 'disabled' : ''}`}><Camera size={18}/><span><strong>Fotografar código ou nome de perto</strong><small>Opcional. Esta foto é usada só na identificação.</small></span><ChevronRight size={17}/></label>
      {(form.photo || form.backPhoto) && <button type="button" className="smart-read" disabled={busy || aiBusy} onClick={() => identify()}><ScanLine size={18}/>{busy ? `Lendo áreas importantes… ${progress}%` : 'Identificar pelas fotos'}</button>}
      {aiReady && (form.photo || form.backPhoto || originals.current.detail) && <>
        <button type="button" className="smart-ai" disabled={busy || aiBusy} onClick={identifyWithAI}>{aiBusy ? 'Analisando com IA…' : 'Analisar com IA'}<small>Envia as fotos ao Google para sugerir os dados.</small></button>
        <div className="smart-ai-usage"><span>{usage.attempts} {usage.attempts === 1 ? 'tentativa' : 'tentativas'} hoje neste aparelho{usage.budget ? ` · ${Math.max(0, usage.budget - usage.attempts)} restantes na sua meta` : ''}</span>{usage.limited && <strong>O serviço recusou uma chamada por limite ou capacidade. Confira a cota oficial.</strong>}<details><summary>Acompanhar uso e definir meta</summary><p>O saldo real não é fornecido ao app. Esta contagem é só deste aparelho; outros aparelhos e limites por minuto ou tokens podem mudar a disponibilidade.</p><label>Meta diária de referência <input type="number" inputMode="numeric" min="1" max="10000" value={usage.budget || ''} placeholder="Ex.: 20" onChange={event => setUsage(setAiBudget(uid, event.target.value))}/></label><a href="https://aistudio.google.com/usage?tab=rate-limit" target="_blank" rel="noreferrer">Ver limites no Google AI Studio</a><a href="https://firebase.google.com/docs/ai-logic/monitoring" target="_blank" rel="noreferrer">Ver uso real no Firebase</a></details></div>
      </>}
    </>}
    {mode === 'name' && <div className="smart-name"><label htmlFor="model-search">Busque o nome do carrinho</label><input id="model-search" type="search" value={name} onChange={event => { setName(event.target.value); setCode(''); onSet('code', ''); }} placeholder="Ex.: Porsche 993 GT2"/></div>}
    {hasOutcome && <div ref={resultRef} className="smart-outcome" aria-live="polite">
      {existing && <div className="smart-owned" role="alert"><AlertTriangle size={20}/><div><strong>Você já tem este carrinho</strong><p>{existing.model}{existing.year ? ` · ${existing.year}` : ''}{existing.color ? ` · ${existing.color}` : ''}. Abra o cadastro para conferir ou ajustar a quantidade.</p><button type="button" onClick={() => onSelectOwned(existing)}>Ver meu cadastro</button></div></div>}
      {reading && !code.trim() && !name.trim() && <div className="smart-feedback" role="status"><strong>{reading.candidates.length ? `Possíveis versões encontradas${reading.source === 'ai' ? ' pela IA' : ''}` : 'Ainda não encontrei uma versão segura'}</strong><p>{reading.error || (reading.candidates.length ? 'Confira o código, ano e série antes de escolher.' : 'Tente uma foto de perto ou digite o código de cinco caracteres.')}</p>{reading.codes?.length > 0 && <small>Códigos lidos: {reading.codes.join(', ')}</small>}{hints.map(([field, label]) => <button type="button" key={field} onClick={() => applyHint(field, reading.hints[field])}><Check size={16}/>{form[field] === reading.hints[field] ? `${label} aplicado: ` : `Usar ${label}: `}{reading.hints[field]}</button>)}{reading.technical && <details><summary>Ver detalhe do erro</summary><pre>{reading.technical}</pre></details>}{reading.raw && <details><summary>Ver texto identificado nas fotos</summary><pre>{reading.raw}</pre></details>}</div>}
      {code.trim().length >= 5 && !codeMatches.length && !existing && <p className="smart-no-result">Código não encontrado nesta biblioteca. Confira as letras ou continue o cadastro manual.</p>}
      {candidates.length > 0 && <div className="smart-results"><span>{candidates.length} {candidates.length === 1 ? 'versão encontrada' : 'versões encontradas'}</span>{candidates.map(({ item, code: codeEvidence, name: nameEvidence, series, seriesNo }) => { const owned = ownedMatch(cars, { catalogId: item.id, code: item.code }); return <button type="button" key={item.id} className={owned ? 'is-owned' : ''} onClick={() => owned ? onSelectOwned(owned) : onPickRelease(item, { ...form, code: item.code })}><span><strong>{item.model}</strong><small>{item.year} · {item.series} · {item.code}{item.seriesNo ? ` · ${item.seriesNo}` : ''}</small>{owned ? <em>Já está na sua garagem · Ver cadastro</em> : codeEvidence && nameEvidence ? <em>Nome e código conferem</em> : nameEvidence && series && seriesNo ? <em>Nome, série e número conferem</em> : null}</span><ChevronRight size={19}/></button>; })}</div>}
    </div>}
    <p className="smart-manual">Não achou? Preencha os detalhes abaixo para cadastrar sem a biblioteca.</p>
    {preview && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={preview === 'front' ? 'Foto da frente ampliada' : 'Foto do verso ampliada'}><div className="photo-viewer-bar"><span>{preview === 'front' ? 'Frente' : 'Verso'} da embalagem</span><button type="button" onClick={() => setPreview(null)} aria-label="Fechar foto">×</button></div><img src={preview === 'front' ? form.photo : form.backPhoto} alt={preview === 'front' ? 'Frente da embalagem ampliada' : 'Verso da embalagem ampliada'}/></div>}
  </section>;
}
