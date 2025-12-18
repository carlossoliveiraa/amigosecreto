import { useEffect, useMemo, useState } from "react";
import './App.css';
import { revealBox } from './api';

type Box = {
  id: string;
  revealedName: string | null;
  locked: boolean;
};

type RevealedItem = {
  boxId: string;
  name: string;
  revealerName?: string | null;
  revealerPhone?: string | null;
};

type AppState = {
  remainingNames: string[];
  boxes: Box[];
  revealedLog: RevealedItem[];
  usedPhones?: Record<string, boolean>;
};

// NOTE: For testing we keep state in-memory only (no persistence).

const NAMES: string[] = [
  "Adilson","Beatriz","Beto","Carlinhos","Eduardo","Felipe","Gleice","Guilherme",
  "Jessica","Joao Batista","Lais","Leonardo","Leticia","Luiza",
  "Miguel","Moises","Murilo","Olga","Pri","Rosana","Solange","Vinicius"
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomAndRemove(list: string[]): string | null {
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  const item = list[idx];
  list.splice(idx, 1);
  return item;
}

function createInitialState(): AppState {
  const boxes: Box[] = Array.from({ length: NAMES.length }, (_, i) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${i}`,
    revealedName: null,
    locked: false
  }));

  return {
    remainingNames: [...NAMES],
    boxes,
    revealedLog: [],
    usedPhones: {}
  };
}

// persistence removed for in-memory testing

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

      <path
        d="M180 44
           C165 20, 125 24, 130 55
           C135 85, 170 78, 180 60
           C190 78, 225 85, 230 55
           C235 24, 195 20, 180 44Z"
        fill="#fff0f0"
        stroke="rgba(0,0,0,0.04)"
        strokeWidth="1.5"
      ></path>

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
      <text x="180" y="132" textAnchor="middle" fontSize="14" fontWeight="700" fill="#6b4b44" opacity="0.85">
        CHOCOLATE
      </text>
    </svg>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(() => createInitialState());
  const [toast, setToast] = useState<string>("");
  const [currentName, setCurrentName] = useState<string>("");
  const [currentPhone, setCurrentPhone] = useState<string>("");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [modalName, setModalName] = useState<string>("");
  const [modalPhone, setModalPhone] = useState<string>("");
  

  // state is intentionally kept in-memory for testing; no persistence effect.

  const lockedCount = useMemo(() => state.boxes.filter(b => b.locked).length, [state.boxes]);
  const remainingCount = state.remainingNames.length;

  function showToast(msg: string) {
    setToast(msg);
    // @ts-expect-error - propriedade auxiliar no function object (simples e suficiente aqui)
    window.clearTimeout(showToast._t);
    // @ts-expect-error - propriedade auxiliar no function object (simples e suficiente aqui)
    showToast._t = window.setTimeout(() => setToast(""), 1700);
  }

  function onBoxClick(boxId: string) {
    // open modal to input name/phone; prefill with panel values
    const box = state.boxes.find(b => b.id === boxId);
    if (!box || box.locked) {
      showToast("Este presente já foi aberto.");
      return;
    }

    setSelectedBox(boxId);
    setModalName(currentName);
    setModalPhone(currentPhone);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedBox(null);
  }

  function maskPhone(p?: string) {
    if (!p) return "";
    const digits = p.replace(/\D/g, "");
    if (!digits) return '';
    if (digits.length <= 3) return digits.replace(/.(?=.{0,2}$)/g, '•');
    // show last 4 digits
    const last = digits.slice(-4);
    return '•••' + last;
  }

  function formatPhone(input: string) {
    const d = input.replace(/\D/g, '');
    if (!d) return '';
    // (XX) XXXXX-XXXX or adapt
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
  }

  function confirmReveal() {
    if (!selectedBox) return;
    const name = modalName.trim();
    const phone = modalPhone.trim();
    if (!name || !phone) {
      showToast("Nome e telefone são obrigatórios.");
      return;
    }

    // basic phone normalization: digits only, require at least 6 digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) {
      showToast('Telefone inválido (digite pelo menos 6 dígitos).');
      return;
    }

    // call server-side reveal function (Edge Function). The server performs the random pick and persistence.
    (async () => {
      try {
        const res = await revealBox(selectedBox, name, phone);
        if (res.error) {
          showToast(res.error);
          return;
        }

        const assigned = res.assignedName ?? null;

        setState(prev => {
          const next = structuredClone(prev) as AppState;
          const box = next.boxes.find(b => b.id === selectedBox);
          if (!box) return prev;
          box.revealedName = assigned;
          box.locked = true;
          next.revealedLog.push({ boxId: box.id, name: assigned ?? '', revealerName: name, revealerPhone: phone });
          next.usedPhones = { ...(next.usedPhones ?? {}), [phone]: true };
          return next;
        });

        setCurrentName(name);
        setCurrentPhone(phone);
        showToast('Caixinha selecionada. O nome foi retornado pelo servidor.');
        closeModal();
      } catch (err: any) {
        showToast(err?.message || 'Erro ao revelar');
      }
    })();
  }

  function onReset() {
    if (!confirm("Tem certeza que deseja resetar tudo?")) return;
    setState(createInitialState());
    showToast("Reset concluído.");
  }

  function onShuffle() {
    setState(prev => {
      const next = structuredClone(prev) as AppState;
      next.boxes = shuffle(next.boxes);
      return next;
    });
    showToast("Caixinhas embaralhadas.");
  }

  return (
    <div style={styles.body}>
      <header style={styles.header}>
        <div style={styles.title}>
          <h1 style={styles.h1}>Amigo Secreto — Natal de Chocolate</h1>
         
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden style={{filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))'}}>
            <circle cx="12" cy="12" r="10" fill="#fef6f1" stroke="#f6dcdc"></circle>
            <path d="M12 6v6l3 2" stroke="#c0473d" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={styles.controls}>
          <span style={styles.pill}>
            Restantes: {remainingCount} | Revelados: {lockedCount}/{state.boxes.length}
          </span>

          <button style={styles.button} onClick={onReset}>Resetar tudo</button>
          <button style={styles.button} onClick={onShuffle}>Embaralhar caixinhas</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.revealedTop} aria-live="polite">
          {state.revealedLog.length === 0 ? (
            <div style={styles.revealedEmpty}>Ninguém abriu uma caixinha ainda</div>
          ) : (
            state.revealedLog.map((r, i) => (
              <div key={`${r.boxId}_${i}`} style={styles.revealerChip}>{r.revealerName ?? 'Anônimo'}</div>
            ))
          )}
        </section>

        <section className="app-grid" style={styles.grid}>
          {state.boxes.map(box => {
            const log = state.revealedLog.find(r => r.boxId === box.id);
            const openedForMe = box.locked && log && log.revealerPhone && currentPhone && log.revealerPhone === currentPhone;
            return (
              <div
                key={box.id}
                style={{ ...styles.card, ...(box.locked ? styles.cardLocked : null) }}
                onClick={() => !box.locked && onBoxClick(box.id)}
                role="button"
                tabIndex={0}
                title={box.locked ? "Já aberto" : "Clique para abrir"}
              >
                <div style={styles.giftwrap}>
                  <div style={styles.gift}>
                    <GiftSvg />
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
                      <p style={styles.reveal}>{box.locked ? "Presente aberto (privado)" : "Clique para abrir 🎁"}</p>
                      <p style={styles.hint}>{box.locked ? "O amigo é mostrado somente para quem abriu." : "Um clique abre uma caixinha e revela um amigo só para você."}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section style={styles.panel}>
          <h2 style={styles.h2}>Seus dados</h2>
          <div style={styles.formRow}>
            <input
              placeholder="Seu nome"
              value={currentName}
              onChange={e => setCurrentName(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Telefone"
              value={currentPhone}
              onChange={e => setCurrentPhone(formatPhone(e.target.value))}
              style={styles.input}
            />
            <button
              style={{ ...styles.button, padding: '8px 10px' }}
              onClick={() => { setCurrentName(''); setCurrentPhone(''); showToast('Dados limpos.'); }}
            >Limpar</button>
          </div>
          {/* Revealed list moved to top as chips */}
          <p style={styles.footerNote}>
            Os resultados ficam salvos apenas em memória nesta sessão. Para reiniciar, use “Resetar tudo”.
          </p>
        </section>
      </main>

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px' }}>Revelar amigo — confirme seus dados</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input placeholder="Seu nome" value={modalName} onChange={e => setModalName(e.target.value)} style={styles.input} />
              <input placeholder="Telefone" value={modalPhone} onChange={e => setModalPhone(formatPhone(e.target.value))} style={styles.input} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={{ ...styles.button, background: '#fffaf8' }} onClick={closeModal}>Cancelar</button>
              <button style={{ ...styles.button, background: '#eaf6f0' }} onClick={confirmReveal}>Confirmar</button>
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>A pessoa só pode revelar uma vez; o nome do amigo fica privado.</p>
          </div>
        </div>
      )}

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
  lockedMark: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "#f7a8c4",
    color: "#fff",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    boxShadow: "0 8px 18px rgba(247,168,196,0.08)",
  }
};
