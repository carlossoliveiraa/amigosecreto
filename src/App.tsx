import { useEffect, useMemo, useState } from "react";
import './App.css';
// serverless reveal removed; using client-side JSON + localStorage flow

// Cores e emojis para caixinhas diferentes
const giftColors = [
  '#ffecec','#eaf6f0','#fff0e6','#f6efe9','#fef6f1','#ead2c0','#f6dcdc','#d6efe6','#fffefc','#f6f6f6',
  '#f0e6ff','#e6f0ff','#e6fff0','#fffbe6','#ffe6fa','#e6ffe6','#e6faff','#f9e6ff','#e6fff9','#fff6e6'
];
const giftEmojis = [
  '🍫','🍬','🍭','🍪','🍩','🍰','🧁','🍡','🍮','🍯','🍦','🍨','🍧','🥮','🍵','🍿','🥧','🍎','🍊','🍋','🍉','🍇','🍓','🍒'
];

type Person = { name: string; votou: boolean };

type Box = {
  id: string;
  revealedName: string | null;
  locked: boolean;
};

type RevealedItem = {
  boxId: string;
  name: string;
  revealerName?: string | null;
};

type AppState = {
  remainingNames: string[];
  boxes: Box[];
  revealedLog: RevealedItem[];
  availableSelectors?: string[];
};


export default function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const NAMES: string[] = people.map(p => p.name);

function pickRandom<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createInitialState(names: string[]): AppState {
  try {
    const raw = localStorage.getItem('amigosecreto_state');
    if (raw) return JSON.parse(raw) as AppState;
  } catch (e) {}
  const boxes: Box[] = Array.from({ length: names.length }, (_, i) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${i}`,
    revealedName: null,
    locked: false
  }));
  return {
    remainingNames: [...names],
    boxes,
    revealedLog: [],
    availableSelectors: [...names]
  };
}
// Checa se o device já jogou (abriu uma caixa)
function hasDevicePlayed(state: AppState): boolean {
  const myName = localStorage.getItem('amigosecreto_my_name');
  if (!myName) return false;
  return state.revealedLog.some(r => r.revealerName === myName);
}

function GiftSvg() {
  return (
    <svg viewBox="0 0 360 220" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="180" cy="206" rx="130" ry="12" fill="rgba(0,0,0,0.06)"></ellipse>
      <rect x="70" y="46" width="220" height="52" rx="14" fill="#ffecec"></rect>
      <rect x="70" y="46" width="220" height="52" rx="14" fill="rgba(255,255,255,0.22)"></rect>
      <rect x="80" y="90" width="200" height="110" rx="18" fill="#fff0e6"></rect>
      <rect x="80" y="90" width="200" height="110" rx="18" fill="rgba(255,255,255,0.28)"></rect>
      <rect x="170" y="46" width="20" height="154" rx="10" fill="#d6efe6"></rect>
      <rect x="170" y="46" width="20" height="154" rx="10" fill="rgba(255,255,255,0.12)"></rect>
      <rect x="70" y="118" width="220" height="20" rx="10" fill="#f6efe9"></rect>
      <rect x="70" y="118" width="220" height="20" rx="10" fill="rgba(255,255,255,0.10)"></rect>
      <path d="M180 44 C165 20, 125 24, 130 55 C135 85, 170 78, 180 60 C190 78, 225 85, 230 55 C235 24, 195 20, 180 44Z" fill="#fff0f0" stroke="rgba(0,0,0,0.04)" strokeWidth="1.5"></path>
      <rect x="110" y="138" width="140" height="46" rx="12" fill="#ead2c0"></rect>
      <rect x="118" y="146" width="124" height="30" rx="10" fill="rgba(255,255,255,0.14)"></rect>
      <g fill="rgba(255,255,255,0.14)">
        <rect x="125" y="150" width="28" height="10" rx="4"></rect>
        <rect x="158" y="150" width="28" height="10" rx="4"></rect>
        <rect x="191" y="150" width="28" height="10" rx="4"></rect>
        <rect x="125" y="164" width="28" height="10" rx="4"></rect>
        <rect x="158" y="164" width="28" height="10" rx="4"></rect>
        <rect x="191" y="164" width="28" height="10" rx="4"></rect>
      </g>
      <text x="180" y="132" textAnchor="middle" fontSize="14" fontWeight="700" fill="#6b4b44" opacity="0.85">CHOCOLATE</text>
    </svg>
  );
}

  const [state, setState] = useState<AppState>(() => createInitialState([]));
    // Carrega lista de pessoas da API ao iniciar
    useEffect(() => {
      fetch('/api/people')
        .then(res => res.json())
        .then((data: Person[]) => {
          setPeople(data);
          // Inicializa o estado do app se ainda não inicializado
          setState(s => {
            if (s.boxes.length === 0) return createInitialState(data.map(p => p.name));
            return s;
          });
        });
    }, []);
  const [toast, setToast] = useState<string>("");
  // Remover setCurrentName não usado
  const [currentName] = useState<string>(() => localStorage.getItem('amigosecreto_my_name') || "");
  // Estado para mostrar seletor de nome se não definido
  const showNameSelect = !localStorage.getItem('amigosecreto_my_name');

  function handleNameSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const chosen = e.target.value;
    if (!chosen) return;
    localStorage.setItem('amigosecreto_my_name', chosen);
    window.location.reload();
  }

  const lockedCount = useMemo(() => state.boxes.filter(b => b.locked).length, [state.boxes]);
  const remainingCount = state.remainingNames.length;

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(""), 1700);
  }

  // Não mostrar select de nome se já selecionado
  useEffect(() => {
    if (currentName) {
      try { sessionStorage.setItem('amigosecreto_session_selected', '1'); } catch (e) {}
    }
  }, [currentName]);

  // Ao clicar na caixinha, só abre se não estiver locked, não for a sua própria, e se usuário ainda não jogou
  function onBoxClick(boxId: string) {
    if (!currentName) {
      showToast('Selecione seu nome antes de abrir uma caixinha.');
      return;
    }
    const box = state.boxes.find(b => b.id === boxId);
    if (!box || box.locked) {
      showToast("Este presente já foi aberto.");
      return;
    }
    // Não pode abrir se já jogou
    const jaJogou = state.revealedLog.some(r => r.revealerName === currentName);
    if (jaJogou) {
      showToast('Você já escolheu seu amigo!');
      return;
    }
    // Revela direto, sem modal de confirmação
    confirmReveal(boxId);
  }

  // Revela amigo para a caixinha escolhida
  async function confirmReveal(boxId: string) {
    const selector = currentName;
    setState(prev => {
      const next = structuredClone(prev) as AppState & { availableSelectors?: string[] };
      const pool = next.remainingNames.filter((n: string) => n !== selector);
      const assigned = pickRandom(pool);
      if (!assigned) {
        showToast('Nenhum nome disponível para atribuir.');
        return prev;
      }
      const box = next.boxes.find(b => b.id === boxId && !b.locked);
      if (!box) {
        showToast('Caixa já foi aberta.');
        return prev;
      }
      box.revealedName = assigned;
      box.locked = true;
      next.revealedLog.push({ boxId: box.id, name: assigned, revealerName: selector });
      next.remainingNames = next.remainingNames.filter((n: string) => n !== assigned);
      try { localStorage.setItem('amigosecreto_state', JSON.stringify(next)); } catch (e) {}
      // Atualiza status de votação na API
      fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          people.map(p =>
            p.name === selector ? { ...p, votou: true } : p
          )
        )
      }).then(() => {
        setPeople(ps => ps.map(p =>
          p.name === selector ? { ...p, votou: true } : p
        ));
      });
      showToast('Presente revelado com sucesso.');
      return next;
    });
  }

  function onShuffle() {
    setState(prev => {
      const next = structuredClone(prev) as AppState;
      next.boxes = shuffle(next.boxes);
      return next;
    });
    showToast("Caixinhas embaralhadas.");
  }

  // se já jogou
  const played = hasDevicePlayed(state);
  // Contagem de jogadas
  const total = state.boxes.length;
  const jogaram = state.revealedLog.length;
  const faltam = total - jogaram;

  // fundo azul clarinho e título destacado
  return (
    <div style={{
      ...styles.body,
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e3f0ff 0%, #b3d8ff 100%)',
      backgroundAttachment: 'fixed',
      position: 'relative'
    }}>
      {/* Efeito de neve natalina */}
      <div style={{position:'fixed',zIndex:0,top:0,left:0,width:'100vw',height:'100vh',pointerEvents:'none',background:'repeating-linear-gradient(0deg,rgba(255,255,255,0.07),rgba(255,255,255,0.07) 2px,transparent 2px,transparent 8px)'}}></div>
      {played && (
        <div style={{background:'#ffecec',color:'#c0473d',padding:12,borderRadius:8,margin:'16px auto',maxWidth:420,textAlign:'center',fontWeight:500,boxShadow:'0 2px 12px #0001'}}>
          Você já jogou!<br/>
          <span style={{fontSize:14}}>Já jogaram: <b>{jogaram}</b> &nbsp;|&nbsp; Faltam: <b>{faltam}</b></span>
        </div>
      )}
      <header style={styles.header}>
        <div style={styles.title}>
          {/* Header destacado com caixa de fundo */}
          <div style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 2px 16px #0001',
            padding: '18px 24px 12px 24px',
            margin: '32px auto 24px auto',
            maxWidth: 600,
            border: '3px solid #b3d8ff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8
          }}>
            <h1 style={{
              ...styles.h1,
              color: '#1a2a3a',
              textShadow: '0 2px 16px #b3d8ff88',
              background: 'none',
              WebkitBackgroundClip: 'unset',
              WebkitTextFillColor: 'unset',
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: '-.01em',
              padding: 0,
              margin: 0
            }}>
              Amigo Secreto — Natal de Chocolate - Família Oliveira
            </h1>
            {showNameSelect ? (
              <select
                style={{marginTop:12,padding:'8px 16px',fontSize:16,borderRadius:10,border:'1px solid #b3d8ff'}}
                defaultValue=""
                onChange={handleNameSelect}
              >
                <option value="">Selecione quem você é...</option>
                {NAMES.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            ) : (
              currentName && (
                <div style={{color:'#1976d2',fontWeight:600,fontSize:18,marginTop:2}}>
                  Você é: <span style={{color:'#c0473d'}}>{currentName}</span>
                </div>
              )
            )}
            <div style={{display:'flex',alignItems:'center',gap:16,marginTop:8}}>
              <span style={{
                background:'#e3f0ff',
                color:'#1976d2',
                borderRadius:12,
                padding:'4px 14px',
                fontWeight:600,
                fontSize:16
              }}>
                Restantes: {remainingCount} | Revelados: {lockedCount}/{state.boxes.length}
              </span>
              <button style={{...styles.button,background:'#b3d8ff',color:'#1a2a3a',fontWeight:700}} onClick={onShuffle}>Embaralhar caixinhas</button>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Lista de todos os participantes, mostrando quem já jogou */}
        <section style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 12px #0001',
          padding: '16px 20px',
          margin: '0 auto 24px auto',
          maxWidth: 480,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
        }}>
          <h3 style={{width:'100%',textAlign:'center',margin:'0 0 8px 0',fontSize:18,color:'#1976d2'}}>Participantes</h3>
          {people.map((p) => {
            return (
              <span key={p.name} style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: p.votou ? '#b3d8ff' : '#e3f0ff',
                color: p.votou ? '#1976d2' : '#888',
                fontWeight: p.votou ? 700 : 400,
                fontSize: 15,
                border: p.votou ? '2px solid #1976d2' : '1px solid #b3d8ff',
                opacity: p.votou ? 1 : 0.7,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {p.votou ? '✔️' : '⏳'} {p.name}
              </span>
            );
          })}
        </section>
        <section style={styles.revealedTop} aria-live="polite">
          {state.revealedLog.length === 0 ? (
            <div style={styles.revealedEmpty}>Ninguém abriu uma caixinha ainda</div>
          ) : (
            <>
              {state.revealedLog.map(item => (
                <div key={item.boxId} style={styles.revealerChip}>{item.revealerName ?? 'Anônimo'}</div>
              ))}
            </>
          )}
        </section>

        <section className="app-grid" style={styles.grid}>
          {state.boxes.map(box => {
            const log = state.revealedLog.find(r => r.boxId === box.id);
            const openedForMe = box.locked && log && log.revealerName && currentName && log.revealerName === currentName;
            return (
              <div
                key={box.id}
                style={{ ...styles.card, ...(box.locked ? styles.cardLocked : null) }}
                onClick={() => onBoxClick(box.id)}
                role="button"
                tabIndex={0}
                title={box.locked ? "Já aberto" : "Abrir presente"}
              >
                <div className="giftwrap">
                  <div className="gift" style={{position:'relative',background:giftColors[state.boxes.indexOf(box)%giftColors.length],borderRadius:16}}>
                    <GiftSvg key={box.id} />
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      fontSize: 22,
                      opacity: 0.85
                    }}>{giftEmojis[state.boxes.indexOf(box)%giftEmojis.length]}</div>
                  </div>
                  {box.locked && <div style={styles.lockedMark}>ABERTO</div>}
                </div>

                <div style={styles.content}>
                  {openedForMe ? (
                    <>
                      <p style={{ ...styles.reveal, ...styles.revealOpened }}>{box.revealedName}</p>
                      <p style={styles.hint}>Parabéns — esse é seu amigo secreto!</p>
                    </>
                  ) : (
                    <>
                      <p style={styles.reveal}>{box.locked ? "Presente aberto (privado)" : "Abrir presente 🎁"}</p>
                      {/* Mensagem de instrução removida para produção */}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section style={styles.panel} className="panel">
          <h2 style={styles.h2}>Resultados</h2>
          <div style={styles.revealedLog}>
            {state.revealedLog.length === 0 && (
              <div style={styles.revealedEmpty}>Ninguém abriu uma caixinha ainda</div>
            )}
            {state.revealedLog.map((item) => (
              <div key={item.boxId} style={styles.revealedItem}>
                <div style={styles.revealedName}>{item.revealerName ?? 'Anônimo'}</div>
                <div style={styles.revealedArrow}>→</div>
                <div style={styles.revealedName}>{item.name}</div>
              </div>
            ))}
          </div>
          {/* Nota sobre privacidade */}
          <p style={styles.footerNote}>
            Os resultados ficam salvos apenas em memória nesta sessão.
          </p>
        </section>
      </main>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
    body: {
    margin: 0,
    minHeight: "100vh",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    boxSizing: 'border-box',
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    color: "#263228",
    backgroundImage: "url('/christmas-snow.svg'), url('/holly.svg')",
    backgroundRepeat: 'repeat, no-repeat',
    backgroundPosition: '0 0, right top',
    backgroundSize: '140px, 320px',
    background:
      "radial-gradient(900px 500px at 18% 0%, #fffdf9 0%, transparent 70%)," +
      "radial-gradient(900px 500px at 82% 0%, #fffcf5 0%, transparent 70%)," +
      "linear-gradient(180deg, #fffdfc, #fffefa)",
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "22px 18px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  title: { display: "flex", flexDirection: "column", gap: 6, minWidth: 260 },
  h1: { margin: 0, fontSize: "clamp(20px, 3vw, 30px)", letterSpacing: "-.02em" },
  sub: { margin: 0, color: "#6b7280", fontSize: 14, lineHeight: 1.35, maxWidth: 720 },
  controls: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" },
  pill: {
    border: "1px dashed rgba(26,83,45,0.08)",
    background: "linear-gradient(90deg,#f7fff6,#effff1)",
    padding: "10px 12px",
    borderRadius: 999,
    fontSize: 13,
    color: "#1f6b3f",
    whiteSpace: "nowrap",
  },
  button: {
    border: "1px solid rgba(196,50,50,0.08)",
    background: "linear-gradient(180deg,#fff6f6,#fff0f0)",
    color: "#7a2b2b",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(122,43,43,0.06)",
    fontWeight: 700,
  },
  main: { flex: 1, width: '100%', maxWidth: 1100, margin: "0 auto", padding: "12px 18px 28px", display: "grid", gap: 16 },
  grid: { display: "grid", gap: 14 },
  revealedTop: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', width: '100%', marginBottom: 6 },
  revealerChip: { background: 'linear-gradient(90deg,#fff1f1,#fff7f7)', padding: '8px 12px', borderRadius: 999, boxShadow: '0 6px 18px rgba(0,0,0,0.04)', fontWeight: 700, color: '#8b2d2d' },
  revealedEmpty: { color: '#6b7280', fontSize: 14, padding: '6px 10px' },
  card: {
    background: "#ffffffee",
    border: "1px solid #f4e7e0",
    borderRadius: 18,
    boxShadow: "0 8px 22px rgba(0,0,0,.06)",
    overflow: "hidden",
    position: "relative",
    userSelect: "none",
    cursor: "pointer",
  },
  cardLocked: { cursor: "default", opacity: 0.98, pointerEvents: 'none', border: '1px solid #d1f0df', background: '#f6fff7', boxShadow: 'inset 0 2px 0 rgba(31,95,58,0.02)' },
  giftwrap: {
    height: 150,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    background: "linear-gradient(135deg, #fffaf8, #fff7f3)",
    position: "relative",
  },
  gift: { width: "100%", maxWidth: 320, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  lockedMark: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "#1f8a51",
    color: "#fff",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    boxShadow: "0 8px 18px rgba(31,138,81,0.16)",
  },
  content: { padding: "12px 12px 14px", display: "flex", flexDirection: "column", gap: 8, minHeight: 92 },
  reveal: { margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: "-.01em", minHeight: 24 },
  hint: { margin: 0, fontSize: 12, color: "#6b7280" },
  revealOpened: { margin: 0, fontSize: 18, fontWeight: 900, color: '#0f5132', background: 'linear-gradient(90deg,#eaf7ee,#e8f4ea)', padding: '8px 12px', borderRadius: 10, boxShadow: '0 6px 18px rgba(31,95,58,0.06)' },
  panel: {
    background: "#ffffffec",
    border: "1px solid #f4e7e0",
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
    padding: 14,
  },
  h2: { margin: "0 0 8px", fontSize: 16, letterSpacing: "-.01em" },
  list: { margin: 0, paddingLeft: 18, color: "#6b7280", fontSize: 14, lineHeight: 1.6 },
  footerNote: { margin: "10px 0 0", fontSize: 12, color: "#6b7280" },
  toast: {
    position: "fixed",
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
    background: "rgba(17,24,39,0.95)",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: 13,
  }
  ,
  formRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap'
  },
  input: {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid #ece3dd',
    background: '#fff',
    minWidth: 120,
  }
  ,
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10,12,12,0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 60,
  },
  modal: {
    background: '#fffefc',
    padding: 18,
    borderRadius: 12,
    boxShadow: '0 18px 50px rgba(11,22,33,0.18)',
    maxWidth: 540,
    width: '100%',
  },
  revealedLog: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '12px 0',
    borderTop: '1px solid #f4e7e0',
    borderBottom: '1px solid #f4e7e0',
    marginTop: 12,
    color: '#1f2937',
  },
  revealedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: 14,
    fontWeight: 500,
    position: 'relative',
  },
  revealedName: {
    flex: 1,
    textAlign: 'center',
    padding: '0 8px',
    borderRadius: 8,
    background: 'linear-gradient(90deg,#e3f2fd,#e8f5e9)',
    color: '#0d47a1',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  revealedArrow: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 18,
    color: '#6b7280',
  },
};
