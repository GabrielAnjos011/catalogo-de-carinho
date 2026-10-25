import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, Plus, CirclePlus, Camera, CarFront, Package, ShieldCheck, WifiOff, Cloud, CloudOff, Download, Upload, Settings, X, ArrowLeft, Check, Trash2, Pencil, ScanLine, Sparkles, LayoutGrid, ListFilter, RotateCw, AlertTriangle, HardDrive, LogOut, ChevronRight, ShoppingBag, ZoomIn } from 'lucide-react';
import { allCars, allRecords, newCar, putCar, removeCar, importCars } from './data';
import { normalize, searchCars, possibleDuplicates, extractHints } from './search';
import { compressPhoto, recognizePhoto } from './image';
import OcrReview from './OcrReview';
import './style.css';

const cloudConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_APP_ID);
const loadCloud = () => import('./cloud');
const emptyDraft = () => newCar();
const dateLabel = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

function Placeholder({ small = false }) {
  return <div className={`car-placeholder ${small ? 'small' : ''}`}><div className="placeholder-glow" /><CarFront size={small ? 42 : 82} strokeWidth={1.3} /><span>GARAGEMMELQUEHW</span></div>;
}

function PhotoViewer({ photo, alt, onClose }) {
  useEffect(() => {
    const handleEscape = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="Foto ampliada" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="photo-viewer-bar"><span>Foto da embalagem</span><button type="button" onClick={onClose} aria-label="Fechar foto"><X size={23} /></button></div>
    <img src={photo} alt={alt} />
    <p>Foto completa · Toque fora da imagem para fechar</p>
  </div>;
}

function App() {
  const [cars, setCars] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('collection');
  const [query, setQuery] = useState('');
  const [checkQuery, setCheckQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [draft, setDraft] = useState(null);
  const [selected, setSelected] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const fileInput = useRef(null);
  const importInput = useRef(null);
  const toastTimer = useRef();

  async function reload() { setCars(await allCars()); setLoaded(true); }
  function notify(message) { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4300); }
  async function runSync(uid = user?.uid) {
    if (!uid || syncing) return;
    setSyncing(true);
    try {
      const { syncCars } = await loadCloud();
      const result = await syncCars(uid);
      await reload();
      setSyncMessage(`Atualizado agora · ${result.uploaded} enviados, ${result.downloaded} recebidos`);
    } catch (error) {
      setSyncMessage(`Pendente: ${error.message}`);
    } finally { setSyncing(false); }
  }

  useEffect(() => {
    reload();
    const online = () => { setIsOnline(true); };
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    let active = true;
    let unsubscribe = () => {};
    if (cloudConfigured) loadCloud().then(({ observeUser }) => { if (active) unsubscribe = observeUser(current => setUser(current)); }).catch(error => notify(`Falha ao conectar Firebase: ${error.message}`));
    return () => { active = false; window.removeEventListener('online', online); window.removeEventListener('offline', offline); unsubscribe(); clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => { if (user && isOnline) runSync(user.uid); }, [user?.uid, isOnline]);

  useEffect(() => {
    if (!draft && !selected && !previewPhoto) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [draft, selected, previewPhoto]);

  const filteredCars = useMemo(() => {
    const result = searchCars(cars, query).filter(car => filter === 'Todos' || (filter === 'Lacrados' ? car.condition === 'Lacrado' : filter === 'Soltos' ? car.condition === 'Solto' : car.maker === filter));
    return [...result].sort((a, b) => b.createdAt - a.createdAt);
  }, [cars, query, filter]);
  const totalPieces = cars.reduce((sum, car) => sum + (Number(car.quantity) || 1), 0);
  const uniqueModels = new Set(cars.map(car => normalize(car.model)).filter(Boolean)).size;
  const duplicateModels = totalPieces - uniqueModels;
  const filters = ['Todos', 'Lacrados', 'Soltos', ...new Set(cars.map(car => car.maker).filter(Boolean))];

  async function saveDraft(car) {
    const model = car.model.trim();
    if (!model) { notify('Informe o modelo do carrinho.'); return; }
    if (!Number.isInteger(Number(car.quantity)) || Number(car.quantity) < 1) { notify('A quantidade precisa ser pelo menos 1.'); return; }
    const saved = { ...car, model, quantity: Number(car.quantity), updatedAt: Date.now() };
    try {
      await putCar(saved);
      await reload();
      setDraft(null);
      setSelected(null);
      setView(view === 'check' ? 'check' : 'collection');
      notify('Carrinho salvo na sua garagem.');
      if (user && isOnline) await runSync(user.uid);
    } catch (error) { notify(`Não foi possível salvar: ${error.message}`); }
  }

  async function deleteSelected() {
    if (!selected || !window.confirm(`Excluir ${selected.model} da coleção?`)) return;
    await removeCar(selected);
    await reload();
    setSelected(null);
    notify('Carrinho excluído.');
    if (user && isOnline) await runSync(user.uid);
  }

  function openAdd() { setDraft(emptyDraft()); setSelected(null); }
  function addFromCheck() { setDraft({ ...newCar(), model: checkQuery.trim() }); setSelected(null); }
  async function handleExport() {
    const data = { app: 'GaragemMelqueHW', version: 1, exportedAt: new Date().toISOString(), cars };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `garagem-melque-hw-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Backup baixado. Guarde o arquivo em local seguro.');
  }
  async function handleImport(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.cars) || payload.cars.some(car => !car.id || !car.model)) throw new Error('Arquivo de backup inválido.');
      const safe = payload.cars.map(car => ({ ...car, updatedAt: Number(car.updatedAt) || Date.now(), createdAt: Number(car.createdAt) || Date.now(), quantity: Number(car.quantity) || 1 }));
      const existing = new Map((await allRecords()).map(car => [car.id, car]));
      const restoreTime = Date.now();
      await importCars(safe.filter(car => !existing.has(car.id) || existing.get(car.id).deleted || car.updatedAt > existing.get(car.id).updatedAt)
        .map(car => existing.get(car.id)?.deleted ? { ...car, deleted: false, updatedAt: restoreTime } : car));
      await reload(); notify(`${safe.length} registro(s) verificados no backup.`);
      if (user && isOnline) await runSync(user.uid);
    } catch (error) { notify(`Falha na importação: ${error.message}`); }
    if (importInput.current) importInput.current.value = '';
  }
  async function handleAuth(event) {
    event.preventDefault(); setAuthBusy(true);
    try { const { login } = await loadCloud(); await login(authEmail, authPassword, authMode === 'register'); setAuthPassword(''); notify('Conta conectada. Sincronizando sua coleção.'); }
    catch (error) { notify(error.code === 'auth/invalid-credential' ? 'E-mail ou senha incorretos.' : error.code === 'auth/email-already-in-use' ? 'Esse e-mail já tem conta.' : error.message); }
    finally { setAuthBusy(false); }
  }

  async function leaveAccount() { const { logout } = await loadCloud(); await logout(); notify('Você saiu da conta. Os dados locais continuam aqui.'); }

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => { setView('collection'); setQuery(''); }} aria-label="Ir para a coleção">
        <span className="brand-icon"><CarFront size={25} strokeWidth={2.2} /></span>
        <span className="brand-text">Garagem<span>MelqueHW</span><small>SEU ACERVO, EM BOAS MÃOS</small></span>
      </button>
      <div className="nav-caption">MENU PRINCIPAL</div>
      <nav className="main-nav" aria-label="Menu principal">
        <button className={view === 'collection' ? 'active' : ''} onClick={() => setView('collection')}><LayoutGrid size={19} /> Minha coleção <span>{cars.length}</span></button>
        <button className={view === 'check' ? 'active' : ''} onClick={() => setView('check')}><Search size={19} /> Conferir na loja</button>
        <button onClick={openAdd}><Plus size={19} /> Adicionar carrinho</button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Settings size={19} /> Configurações</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip"><div className="tip-icon"><ShieldCheck size={20} /></div><strong>Compra sem repeteco</strong><p>Pesquise aqui antes de levar um novo modelo para casa.</p></div>
        <div className="sidebar-footer"><span className={`status-dot ${isOnline ? '' : 'offline'}`} />{user ? 'Nuvem conectada' : 'Dados neste aparelho'}</div>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-icon"><CarFront size={23} /></span><strong>Garagem<span>MelqueHW</span></strong></div>
        <div className="breadcrumb">MINHA GARAGEM <ChevronRight size={14} /> <b>{view === 'collection' ? 'Coleção' : view === 'check' ? 'Conferir na loja' : 'Configurações'}</b></div>
        <div className="top-actions"><span className={`sync-badge ${!isOnline ? 'disconnected' : ''}`}>{isOnline ? user ? <Cloud size={15} /> : <HardDrive size={15} /> : <WifiOff size={15} />}{!isOnline ? 'Offline' : user ? 'Na nuvem' : 'Local'}</span><button className="avatar" onClick={() => setView('settings')} title="Configurações">MH</button></div>
      </header>

      {view !== 'settings' ? <div className="page-content">
        <div hidden={view !== 'collection'}>
        <section className="welcome-row"><div><span className="eyebrow"><span className="eyebrow-line" /> O SEU UNIVERSO EM MINIATURA</span><h1>Minha coleção<span className="accent-dot">.</span></h1><p>Todos os seus carrinhos, organizados e prontos para encontrar.</p></div><button className="primary desktop-add" onClick={openAdd}><Plus size={19} /> Adicionar carrinho</button></section>
        <section className="hero-banner"><div className="hero-copy"><span className="hero-kicker"><Sparkles size={15} /> LEVE SUA COLEÇÃO COM VOCÊ</span><h2>Achou um carrinho na loja?<br/><em>Confira antes de comprar.</em></h2><p>Pesquise pelo nome, marca ou código e descubra em segundos se ele já está na sua garagem.</p><button onClick={() => setView('check')} className="hero-button">Conferir agora <Search size={17} /></button></div><div className="hero-art" aria-hidden="true"><div className="hero-ring ring-one"/><div className="hero-ring ring-two"/><div className="hero-track"/><div className="hero-car"><div className="car-top"/><div className="car-body"/><div className="car-window"/><div className="wheel wheel-left"/><div className="wheel wheel-right"/></div><span className="hero-number">01 / 01</span></div></section>
        <section className="stats-grid" aria-label="Resumo da coleção"><div className="stat-card"><span className="stat-icon coral"><CarFront size={21}/></span><div><strong>{totalPieces}</strong><span>Carrinhos</span></div></div><div className="stat-card"><span className="stat-icon blue"><Package size={21}/></span><div><strong>{uniqueModels}</strong><span>Modelos diferentes</span></div></div><div className="stat-card"><span className="stat-icon cream"><ScanLine size={21}/></span><div><strong>{Math.max(0, duplicateModels)}</strong><span>Peças extras</span></div></div></section>
        <section className="catalog-section"><div className="section-heading"><div><span className="eyebrow">O ACERVO</span><h2>Carrinhos na garagem <span>{cars.length}</span></h2></div><button className="text-button" onClick={openAdd}>Adicionar novo <Plus size={17}/></button></div><div className="toolbar"><label className="search-box" htmlFor="catalog-search"><Search size={20}/><input id="catalog-search" type="search" placeholder="Busque por modelo, marca, série ou código..." value={query} onChange={e => setQuery(e.target.value)} /><kbd>⌕</kbd></label><div className="filter-title"><ListFilter size={18}/> Filtrar</div></div><div className="filter-chips">{filters.map(option => <button key={option} className={filter === option ? 'selected' : ''} onClick={() => setFilter(option)}>{option}</button>)}</div>
          {!loaded ? <p className="empty-copy">Carregando sua garagem...</p> : filteredCars.length ? <div className="car-grid">{filteredCars.map(car => <button className="car-card" key={car.id} onClick={() => setSelected(car)}><div className="card-photo">{car.photo ? <img src={car.photo} alt={`Foto de ${car.model}`} /> : <Placeholder small />}<span className="card-condition">{car.condition || 'Lacrado'}</span></div><div className="card-info"><span className="card-maker">{car.maker || 'Hot Wheels'} {car.year ? `· ${car.year}` : ''}</span><h3>{car.model}</h3><p>{car.series || 'Série não informada'} {car.color ? `· ${car.color}` : ''}</p><div className="card-bottom"><span>{car.quantity > 1 ? `${car.quantity} unidades` : '1 unidade'}</span><ChevronRight size={17}/></div></div></button>)}</div> : <div className="empty-state"><div className="empty-illustration"><CarFront size={60} strokeWidth={1.25}/><span>01</span></div><h3>{query || filter !== 'Todos' ? 'Nenhum carrinho encontrado' : 'Sua garagem começa aqui'}</h3><p>{query || filter !== 'Todos' ? 'Tente outro nome ou remova os filtros.' : 'Cadastre seu primeiro carrinho com uma foto. Depois, é só pesquisar antes de comprar outro.'}</p>{query || filter !== 'Todos' ? <button className="secondary" onClick={() => { setQuery(''); setFilter('Todos'); }}>Limpar busca</button> : <button className="primary" onClick={openAdd}><Plus size={18}/> Adicionar primeiro carrinho</button>}</div>}
        </section>
         <footer className="page-footer">GARAGEMMELQUEHW <span>·</span> FEITO PARA SUA COLEÇÃO</footer>
        </div>
        <div hidden={view !== 'check'}><PurchaseCheck cars={cars} query={checkQuery} setQuery={setCheckQuery} onSelect={setSelected} onAdd={addFromCheck} /></div>
      </div> : <div className="page-content settings-page"><span className="eyebrow"><span className="eyebrow-line"/> CONTROLE TOTAL</span><h1>Configurações<span className="accent-dot">.</span></h1><p className="page-subtitle">Seus dados, suas escolhas.</p><div className="settings-grid"><section className="setting-panel"><div className="panel-head"><span className="panel-icon"><Cloud size={24}/></span><div><h2>Sincronização na nuvem</h2><p>Guarde uma cópia e acesse em outros aparelhos.</p></div></div>{!cloudConfigured ? <div className="notice"><CloudOff size={21}/><p>O Firebase ainda não foi configurado. O catálogo funciona normalmente neste aparelho. Siga o README para ativar a sincronização gratuita.</p></div> : user ? <div className="cloud-connected"><div className="connected-user"><span><Check size={20}/></span><div><strong>{user.email}</strong><small>{syncMessage || 'Conta conectada'}</small></div></div><div className="settings-actions"><button className="secondary" disabled={syncing || !isOnline} onClick={() => runSync()}><RotateCw size={17} className={syncing ? 'spinning' : ''}/>{syncing ? 'Sincronizando...' : 'Sincronizar agora'}</button><button className="ghost" onClick={leaveAccount}><LogOut size={17}/> Sair da conta</button></div></div> : <form className="auth-form" onSubmit={handleAuth}><div className="auth-tabs"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Entrar</button><button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Criar conta</button></div><label>E-mail<input required type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="voce@exemplo.com" /></label><label>Senha<input required minLength={6} type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></label><button className="primary" disabled={authBusy}>{authBusy ? 'Aguarde...' : authMode === 'register' ? 'Criar conta gratuita' : 'Entrar e sincronizar'}</button><p>Ao entrar, os carrinhos salvos neste aparelho são combinados com os da sua conta.</p></form>}</section><section className="setting-panel"><div className="panel-head"><span className="panel-icon amber"><HardDrive size={24}/></span><div><h2>Backup da coleção</h2><p>Tenha uma cópia independente dos seus dados.</p></div></div><div className="backup-actions"><div><strong>Exportar catálogo</strong><span>Baixa um arquivo JSON com fotos e informações.</span><button className="secondary" onClick={handleExport}><Download size={18}/> Baixar backup</button></div><div><strong>Importar backup</strong><span>Restaura registros de um arquivo exportado.</span><button className="secondary" onClick={() => importInput.current?.click()}><Upload size={18}/> Escolher arquivo</button><input ref={importInput} type="file" accept="application/json,.json" hidden onChange={e => handleImport(e.target.files?.[0])}/></div></div></section></div><div className="privacy-note"><ShieldCheck size={20}/><span>As fotos são comprimidas no seu próprio aparelho. O reconhecimento de texto também roda no navegador. Nenhuma IA paga é necessária.</span></div></div>}
    </main>

    <nav className="mobile-nav" aria-label="Menu móvel">
      <button className={`mobile-tab ${view === 'collection' ? 'active' : ''}`} aria-current={view === 'collection' ? 'page' : undefined} onClick={() => setView('collection')}><span className="tab-icon"><LayoutGrid size={21}/></span><span>Coleção</span></button>
      <button className={`mobile-tab ${view === 'check' ? 'active' : ''}`} aria-current={view === 'check' ? 'page' : undefined} onClick={() => setView('check')}><span className="tab-icon"><Search size={21}/></span><span>Conferir</span></button>
      <button className="mobile-tab mobile-add" onClick={openAdd} aria-label="Adicionar carrinho"><span className="tab-icon"><CirclePlus size={21}/></span><span>Adicionar</span></button>
      <button className={`mobile-tab ${view === 'settings' ? 'active' : ''}`} aria-current={view === 'settings' ? 'page' : undefined} onClick={() => setView('settings')}><span className="tab-icon"><Settings size={21}/></span><span>Ajustes</span></button>
    </nav>

    {selected && !draft && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><div className="detail-modal" role="dialog" aria-modal="true" aria-label={`Detalhes de ${selected.model}`}><button className="close-button" onClick={() => setSelected(null)} aria-label="Fechar"><X size={21}/></button><div className="detail-photo">{selected.photo ? <button type="button" className="photo-open" onClick={() => setPreviewPhoto(selected.photo)} aria-label="Ampliar foto do carrinho"><img src={selected.photo} alt={`Foto de ${selected.model}`}/><span><ZoomIn size={17}/> Ver foto completa</span></button> : <Placeholder/>}</div><div className="detail-body"><span className="eyebrow">{selected.maker || 'HOT WHEELS'} · {selected.condition || 'LACRADO'}</span><h2>{selected.model}</h2><div className="detail-facts">{[['Série', selected.series], ['Ano', selected.year], ['Cor', selected.color], ['Código', selected.code], ['Quantidade', selected.quantity], ['Local', selected.location], ['Adicionado', dateLabel(selected.createdAt)]].filter(([, value]) => value).map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>{selected.notes && <p className="detail-notes">{selected.notes}</p>}<div className="detail-actions"><button className="primary" onClick={() => setDraft({ ...selected })}><Pencil size={17}/> Editar</button><button className="danger" onClick={deleteSelected}><Trash2 size={17}/> Excluir</button></div></div></div></div>}
    {previewPhoto && <PhotoViewer photo={previewPhoto} alt={selected ? `Foto de ${selected.model}` : 'Foto do carrinho'} onClose={() => setPreviewPhoto(null)} />}
    {draft && <CarForm draft={draft} cars={cars} onClose={() => setDraft(null)} onSave={saveDraft} notify={notify} />}
    {toast && <div className="toast" role="status"><Check size={18}/>{toast}<button onClick={() => setToast('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
  </div>;
}

function PurchaseCheck({ cars, query, setQuery, onSelect, onAdd }) {
  const searched = Boolean(normalize(query));
  const matches = searched ? searchCars(cars, query) : [];
  const pieces = matches.reduce((sum, car) => sum + (Number(car.quantity) || 1), 0);
  const recent = [...cars].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  return <section className="check-page">
    <span className="eyebrow"><span className="eyebrow-line" /> CONSULTA RÁPIDA</span>
    <h1>Conferir na loja<span className="accent-dot">.</span></h1>
    <p className="page-subtitle">Encontrou um carrinho? Veja se ele já está na sua garagem antes de comprar.</p>
    <div className="check-search"><Search size={23} /><input id="check-search" aria-label="Modelo para conferir" type="search" enterKeyHint="search" autoComplete="off" placeholder="Digite o modelo. Ex.: Porsche 911" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar consulta"><X size={20}/></button>}</div>
    {!searched ? <div className="check-idle"><div className="check-idle-icon"><ShoppingBag size={31}/></div><h2>Uma olhada antes de levar.</h2><p>Digite o nome completo ou apenas uma parte. A busca também aceita marca, ano, série e código da embalagem.</p>{recent.length ? <div className="recent-checks"><span>ÚLTIMOS NA GARAGEM</span>{recent.map(car => <button key={car.id} onClick={() => setQuery(car.model)}>{car.model}<ChevronRight size={16}/></button>)}</div> : <button className="secondary" onClick={onAdd}><Plus size={18}/> Cadastrar primeiro carrinho</button>}</div> : matches.length ? <div className="check-results"><div className="check-verdict found"><span className="verdict-icon"><Check size={28}/></span><div><small>JÁ ESTÁ NA SUA GARAGEM</small><h2>{pieces === 1 ? 'Você tem 1 carrinho relacionado' : `Você tem ${pieces} carrinhos relacionados`}</h2><p>Compare a cor, o ano e a embalagem para confirmar a variação.</p></div></div><div className="check-result-heading">RESULTADOS NA SUA COLEÇÃO <span>{matches.length}</span></div><div className="check-result-list">{matches.map(car => <button className="check-result" key={car.id} onClick={() => onSelect(car)}><div className="check-thumb">{car.photo ? <img src={car.photo} alt=""/> : <CarFront size={28}/>}</div><div><strong>{car.model}</strong><span>{[car.maker, car.year, car.color].filter(Boolean).join(' · ')}</span><small>{car.quantity > 1 ? `${car.quantity} unidades` : '1 unidade'} · {car.condition || 'Lacrado'}</small></div><ChevronRight className="check-chevron" size={19}/></button>)}</div></div> : <div className="check-results"><div className="check-verdict clear"><span className="verdict-icon"><Search size={27}/></span><div><small>NENHUM RESULTADO</small><h2>Não encontrei “{query.trim()}”</h2><p>Tente outra parte do nome ou confira a grafia antes de decidir.</p></div></div><button className="secondary check-add" onClick={onAdd}><Plus size={18}/> Cadastrar este modelo</button></div>}
    <div className="check-footnote"><ShieldCheck size={18}/> A consulta usa apenas os carrinhos que você cadastrou.</div>
  </section>;
}

function CarForm({ draft: initial, cars, onClose, onSave, notify }) {
  const [form, setForm] = useState(initial);
  const editing = cars.some(car => car.id === initial.id);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(false);
  const input = useRef(null);
  const originalPhoto = useRef(null);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const close = () => {
    if (JSON.stringify(form) !== JSON.stringify(initial) && !window.confirm('Descartar as alterações deste carrinho?')) return;
    onClose();
  };
  const matches = useMemo(() => possibleDuplicates(cars, form), [cars, form.model]);
  async function handlePhoto(file) {
    if (!file) return;
    try { const photo = await compressPhoto(file); originalPhoto.current = file; set('photo', photo); setOcrResult(null); notify('Foto adicionada. Toque na prévia para vê-la inteira.'); }
    catch (error) { notify(error.message); }
    if (input.current) input.current.value = '';
  }
  async function scan() {
    if (!form.photo) return;
    setOcrBusy(true); setOcrProgress(0);
    try {
      let text;
      try {
        text = await recognizePhoto(originalPhoto.current || form.photo, setOcrProgress);
      } catch (error) {
        if (!originalPhoto.current) throw error;
        text = await recognizePhoto(form.photo, setOcrProgress);
      }
      const hints = extractHints(text);
      setOcrResult({ hints, raw: text.trim() });
    } catch (error) { setOcrResult({ error: 'Não foi possível ler a foto. Você pode tentar novamente ou preencher os campos manualmente.' }); }
    finally { setOcrBusy(false); }
  }
  return <><div className="modal-backdrop form-layer"><div className="form-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Editar carrinho' : 'Adicionar carrinho'}><header className="form-header"><button onClick={close} className="back-button"><ArrowLeft size={20}/> Voltar</button><span>{editing ? 'EDITAR REGISTRO' : 'NOVO REGISTRO'}</span><button onClick={close} className="close-button" aria-label="Fechar"><X size={21}/></button></header><div className="form-scroll"><div className="form-intro"><span className="eyebrow"><span className="eyebrow-line"/> SUA COLEÇÃO CRESCE</span><h2>{editing ? 'Editar carrinho' : 'Adicionar carrinho'}<span className="accent-dot">.</span></h2><p>Adicione uma foto se quiser e complete as informações. Leva menos de um minuto.</p></div><div className="photo-upload"><div className="upload-preview">{form.photo ? <button type="button" className="photo-open" onClick={() => setPreviewPhoto(true)} aria-label="Ampliar foto antes de salvar"><img src={form.photo} alt="Prévia do carrinho"/><span><ZoomIn size={16}/> Ver foto</span></button> : <Placeholder/>}</div><div className="upload-controls"><span className="step-label">01 / FOTO OPCIONAL</span><h3>Foto da embalagem</h3><p>Fotografe a frente do blister ou escolha uma imagem. A foto será comprimida para economizar espaço.</p><div className="upload-buttons"><button type="button" className="secondary" onClick={() => input.current?.click()}><Camera size={18}/>{form.photo ? 'Trocar foto' : 'Tirar ou escolher foto'}</button>{form.photo && <button type="button" className="scan-button" disabled={ocrBusy} onClick={scan}><ScanLine size={18}/>{ocrBusy ? `Lendo texto ${ocrProgress}%` : 'Ler embalagem'}</button>}</div><input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={e => handlePhoto(e.target.files?.[0])}/></div>{ocrResult && <OcrReview result={ocrResult} form={form} onApply={set} />}</div><div className="form-section-head"><span className="step-label">02 / INFORMAÇÕES</span><h3>Detalhes do carrinho</h3><p>O nome do modelo é o único campo obrigatório.</p></div><form id="car-form" onSubmit={e => { e.preventDefault(); onSave(form); }}><div className="form-grid"><label className="wide">Modelo <span>*</span><input required value={form.model} onChange={e => set('model', e.target.value)} placeholder="Ex.: Porsche 911 GT3 RS"/></label><label>Marca<input value={form.maker} onChange={e => set('maker', e.target.value)} placeholder="Hot Wheels"/></label><label>Série / linha<input value={form.series} onChange={e => set('series', e.target.value)} placeholder="Ex.: HW Exotics"/></label><label>Ano<input inputMode="numeric" value={form.year} onChange={e => set('year', e.target.value)} placeholder="Ex.: 2024"/></label><label>Cor<input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Ex.: Vermelho"/></label><label>Código do modelo (SKU)<input value={form.code} onChange={e => set('code', e.target.value)} placeholder="Ex.: HKG52"/><small className="field-hint">Fica na embalagem e pode diferenciar o carrinho do UPC.</small></label><label>Quantidade<input type="number" min="1" step="1" value={form.quantity} onChange={e => set('quantity', e.target.value)}/></label><label>Estado<select value={form.condition} onChange={e => set('condition', e.target.value)}><option>Lacrado</option><option>Solto</option><option>Outro</option></select></label><label>Onde está guardado<input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Ex.: Caixa A, estante"/></label><label className="wide">Observações<textarea rows="3" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Variação, rodas, detalhes especiais..."/></label></div>{matches.length > 0 && <div className="duplicate-alert"><AlertTriangle size={21}/><div><strong>Você já tem {matches.length} registro(s) desse modelo</strong><p>{matches.slice(0, 3).map(car => `${car.model}${car.year ? ` (${car.year})` : ''}${car.color ? ` · ${car.color}` : ''}`).join(' · ')}</p></div></div>}</form></div><footer className="form-footer"><span><ShieldCheck size={17}/> Seus dados ficam salvos neste aparelho</span><div><button type="button" className="ghost" onClick={close}>Cancelar</button><button type="submit" form="car-form" className="primary"><Check size={18}/> Salvar carrinho</button></div></footer></div></div>{previewPhoto && <PhotoViewer photo={form.photo} alt="Foto da embalagem antes de salvar" onClose={() => setPreviewPhoto(false)} />}</>;
}

const root = globalThis.__garagemPocketRoot || createRoot(document.getElementById('root'));
globalThis.__garagemPocketRoot = root;
root.render(<App />);
