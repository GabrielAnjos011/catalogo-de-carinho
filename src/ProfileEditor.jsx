import React, { useEffect, useState } from 'react';
import { Check, Paintbrush } from 'lucide-react';
import { accessibleAccent, cleanSuffix, palette } from './profile';

export default function ProfileEditor({ profile, onSave }) {
  const [suffix, setSuffix] = useState(profile.suffix);
  const [color, setColor] = useState(profile.color);
  useEffect(() => { setSuffix(profile.suffix); setColor(profile.color); }, [profile.suffix, profile.color]);
  const accent = accessibleAccent(color);
  const name = `Garagem${cleanSuffix(suffix) || 'Sua'}`;
  const changed = suffix !== profile.suffix || color !== profile.color;

  return <section className="setting-panel identity-panel">
    <div className="panel-head"><span className="panel-icon"><Paintbrush size={24}/></span><div><h2>Identidade da sua garagem</h2><p>Escolha um nome e uma cor para reconhecer seu espaço.</p></div></div>
    <div className="identity-preview" style={{ '--preview-accent': accent }}><span>MINHA COLEÇÃO</span><strong>{name}<i>.</i></strong><small>Seu acervo com a sua cara</small><span className="identity-preview-button"><Check size={16}/> Adicionar carrinho</span></div>
    <label className="identity-name">Nome da garagem <span><b>Garagem</b><input value={suffix} maxLength={18} onChange={event => setSuffix(event.target.value)} placeholder="Seu nome" aria-label="Complemento do nome da garagem"/></span><small>“Garagem” fica fixo. Escreva até 18 letras ou números para completar.</small></label>
    <div className="identity-colors"><strong>Cor principal</strong><div className="palette-options">{palette.map(option => <button type="button" key={option.color} title={option.name} aria-label={option.name} aria-pressed={color === option.color} className={color === option.color ? 'selected' : ''} style={{ '--swatch': option.color }} onClick={() => setColor(option.color)}><Check size={16}/></button>)}<label title="Escolher outra cor" aria-label="Escolher outra cor" className="custom-color"><input type="color" value={color} onChange={event => setColor(event.target.value)}/><Paintbrush size={17}/></label></div><small>Ajustamos cores muito claras para manter os textos legíveis.</small></div>
    <button type="button" className="primary identity-save" disabled={!changed} onClick={() => onSave({ suffix, color })}><Check size={17}/> Salvar identidade</button>
    <p className="identity-note">O nome e a cor aparecem dentro do app. O nome abaixo do ícone instalado continua “Garagem”.</p>
  </section>;
}
