import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, CarFront, Check, ChevronDown, ZoomIn } from 'lucide-react';
import { newCar } from './data';
import { compressPhoto } from './image';
import { ownedForRelease } from './catalog';

export default function QuickAdd({ release, cars, onClose, onSave, onSelect, notify }) {
  const [form, setForm] = useState(() => ({ ...newCar(), catalogId: release.id,
    model: release.model, maker: 'Hot Wheels', series: release.series,
    year: release.year, code: release.code, photo: release.initialPhoto || '' }));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const input = useRef(null);
  const existing = ownedForRelease(cars, release);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const close = () => {
    if ((form.photo || form.color || form.notes || form.location) && !window.confirm('Descartar este cadastro?')) return;
    onClose();
  };
  async function handlePhoto(file) {
    if (!file) return;
    try { set('photo', await compressPhoto(file)); notify('Foto adicionada. Você pode ampliá-la antes de salvar.'); }
    catch (error) { notify(error.message); }
    if (input.current) input.current.value = '';
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try { await onSave(form); } finally { setBusy(false); }
  }

  return <div className="modal-backdrop form-layer"><div className="quick-modal" role="dialog" aria-modal="true" aria-label={`Adicionar ${release.model}`}>
    <header className="quick-header"><button type="button" onClick={close}><ArrowLeft size={20}/> Voltar</button><span>CADASTRO RÁPIDO</span><button type="button" className="quick-close" onClick={close} aria-label="Fechar">×</button></header>
    <form className="quick-scroll" onSubmit={submit}>
      <span className="eyebrow"><span className="eyebrow-line"/> ENCONTRADO NA BIBLIOTECA</span>
      <h2>{release.model}<span className="accent-dot">.</span></h2>
      <p className="quick-subtitle">As informações gerais já estão prontas. Complete apenas o que é seu.</p>
      <div className="quick-reference"><div className="quick-reference-icon"><CarFront size={28}/></div><div><strong>{release.year} · {release.series}</strong><span>{release.variant ? `${release.variant} · ` : ''}Código {release.code}{release.seriesNo ? ` · ${release.seriesNo}` : ''}</span></div><Check size={18}/></div>
      <details className="quick-guide"><summary>Como conferir se é a versão certa? <ChevronDown size={16}/></summary><p>Compare o código de cinco caracteres da embalagem com <strong>{release.code}</strong>. O ano da biblioteca é o lançamento; o ano gravado na base do carrinho pode ser diferente.</p><a href={release.source} target="_blank" rel="noreferrer">Ver registro de origem</a></details>
      {existing.length > 0 && <div className="quick-duplicate"><strong>Você já cadastrou {existing.length} registro(s) deste código.</strong><button type="button" onClick={() => onSelect(existing[0])}>Ver o que tenho</button><p>Se for outra cor ou embalagem, você pode registrar separadamente.</p></div>}
      <div className="quick-photo"><button type="button" onClick={() => form.photo ? setPreview(true) : input.current?.click()}>{form.photo ? <><img src={form.photo} alt="Prévia da sua embalagem"/><span><ZoomIn size={16}/> Ver foto</span></> : <><Camera size={27}/><strong>Foto da sua embalagem</strong><small>Toque para fotografar ou escolher</small></>}</button><div><strong>Sua foto dá vida à garagem</strong><p>Ela aparece no lugar do cartão cinza e ajuda a reconhecer a sua versão.</p>{form.photo && <button type="button" className="secondary" onClick={() => input.current?.click()}><Camera size={17}/> Trocar foto</button>}</div><input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={event => handlePhoto(event.target.files?.[0])}/></div>
      <div className="quick-fields"><label>Cor do seu carrinho <input value={form.color} onChange={event => set('color', event.target.value)} placeholder="Ex.: Azul metálico"/></label><label>Quantidade <input type="number" min="1" step="1" value={form.quantity} onChange={event => set('quantity', event.target.value)}/></label><label>Estado <select value={form.condition} onChange={event => set('condition', event.target.value)}><option>Lacrado</option><option>Solto</option><option>Outro</option></select></label></div>
      <details className="quick-extra"><summary>Local e observações (opcional) <ChevronDown size={17}/></summary><label>Onde está guardado?<input value={form.location} onChange={event => set('location', event.target.value)} placeholder="Ex.: Caixa A"/></label><label>Detalhes da sua embalagem<textarea rows="3" value={form.notes} onChange={event => set('notes', event.target.value)} placeholder="Rodas, variação ou algo especial..."/></label></details>
      <div className="quick-footer"><button className="primary" type="submit" disabled={busy}><Check size={19}/>{busy ? 'Salvando...' : 'Salvar na minha garagem'}</button></div>
    </form>
  </div>{preview && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="Sua foto ampliada"><div className="photo-viewer-bar"><span>Sua embalagem</span><button type="button" onClick={() => setPreview(false)} aria-label="Fechar foto">×</button></div><img src={form.photo} alt="Sua embalagem ampliada"/></div>}</div>;
}
