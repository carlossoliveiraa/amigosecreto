import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import './App.css';
// serverless reveal removed; using client-side JSON + localStorage flow

// Cores para caixinhas diferentes
const giftColors = [
  '#ffecec','#eaf6f0','#fff0e6','#f6efe9','#fef6f1','#ead2c0','#f6dcdc','#d6efe6','#fffefc','#f6f6f6',
  '#f0e6ff','#e6f0ff','#e6fff0','#fffbe6','#ffe6fa','#e6ffe6','#e6faff','#f9e6ff','#e6fff9','#fff6e6'
];

// Tabela "participantes"
type Participante = { id: number; nome: string; votou: boolean };

// Tabela "sorteados"
type Sorteado = { id: number; nome: string; sorteado: boolean };

// Cada caixinha representa UMA pessoa da tabela "sorteados", em ordem aleatória
type Box = {
  id: string;             // identificador visual da caixinha
  personId: number;       // id da pessoa na tabela "sorteados"
  personName: string;     // nome da pessoa na tabela "sorteados"
  revealedName: string | null;
  locked: boolean;
  sorteado?: boolean;     // indica se a caixinha já foi usada
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
  // participantes: quem pode jogar (dropdown)
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  // sorteados: conjunto de pessoas disponíveis nas caixinhas
  const [sorteados, setSorteados] = useState<Sorteado[]>([]);
  const [modalFriend, setModalFriend] = useState<string | null>(null);

function createInitialStateFromSorteados(lista: Sorteado[]): AppState {
  // Embaralha as pessoas para que as caixinhas fiquem em ordem aleatória
  const shuffled = [...lista];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const boxes: Box[] = shuffled.map((p, i) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${i}`,
    personId: p.id,
    personName: p.nome,
    revealedName: null,
    locked: false,
    sorteado: false,
  }));

  const names = shuffled.map((p) => p.nome);

  return {
    remainingNames: [...names],
    boxes,
    revealedLog: [],
    availableSelectors: [...names],
  };
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

  const [state, setState] = useState<AppState>(() => createInitialStateFromSorteados([]));

  // Carrega listas do Supabase ao iniciar
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [{ data: participantesData, error: participantesError }, { data: sorteadosData, error: sorteadosError }] = await Promise.all([
          supabase.from('participantes').select('id, nome, votou').order('id', { ascending: true }),
          supabase.from('sorteados').select('id, nome, sorteado').order('id', { ascending: true }),
        ]);

        if (!participantesError && participantesData) {
          setParticipantes(participantesData as Participante[]);
        }

        if (!sorteadosError && sorteadosData) {
          const sorteadosList = sorteadosData as Sorteado[];
          setSorteados(sorteadosList);
          setState(s => {
            if (s.boxes.length === 0) {
              const disponiveis = sorteadosList.filter(p => !p.sorteado);
              return createInitialStateFromSorteados(disponiveis);
            }
            return s;
          });
        }
      } catch (error) {
        console.error('Erro ao carregar participantes/sorteados:', error);
      }
    }
    fetchInitialData();
  }, []);
  const [toast, setToast] = useState<string>("");
  const [currentName, setCurrentName] = useState<string>("");
  const [currentPersonId, setCurrentPersonId] = useState<number | null>(null);
  const [pendingPersonId, setPendingPersonId] = useState<number | null>(null);
  const [hasRevealed, setHasRevealed] = useState<boolean>(false);
  const hasSelectedPerson = !!currentPersonId;

  function handleNameChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (!value) {
      setPendingPersonId(null);
      return;
    }
    const id = Number(value);
    setPendingPersonId(Number.isNaN(id) ? null : id);
  }

  function handleNameConfirm() {
    if (!pendingPersonId) return;

    const person = participantes.find(p => p.id === pendingPersonId);
    if (!person) return;

    setCurrentName(person.nome);
    setCurrentPersonId(person.id);
    setPendingPersonId(null);

    // Reconstroi as caixinhas excluindo o próprio participante
    setState(prev => {
      const disponiveis = sorteados.filter(p => !p.sorteado && p.id !== person.id);
      const rebuilt = createInitialStateFromSorteados(disponiveis);
      return {
        ...rebuilt,
        revealedLog: prev.revealedLog,
      };
    });
  }

  // Contadores baseados no Supabase
  const remainingPlayers = useMemo(() => participantes.filter(p => !p.votou), [participantes]);
  const lockedCount = useMemo(() => participantes.filter(p => p.votou).length, [participantes]);
  const remainingCount = remainingPlayers.length;
  // Quantas pessoas ainda não foram sorteadas (para controlar exibição das caixinhas)
  const remainingGifts = useMemo(() => sorteados.filter(p => !p.sorteado).length, [sorteados]);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as unknown as { _t: number })._t);
    (showToast as unknown as { _t: number })._t = window.setTimeout(() => setToast(""), 1700);
  }

  // Não mostrar select de nome se já selecionado (sessão desativada a pedido)
  // useEffect(() => {
  //   if (currentName) {
  //     try { sessionStorage.setItem('amigosecreto_session_selected', '1'); } catch {}
  //   }
  // }, [currentName]);

  // Revela amigo para a caixinha escolhida
  async function confirmReveal(boxId: string) {
    const selector = currentName;
    if (!selector || !currentPersonId) {
      showToast('Selecione quem você é primeiro.');
      return;
    }
    setState(prev => {
      const next = structuredClone(prev) as AppState & { availableSelectors?: string[] };
      const box = next.boxes.find(b => b.id === boxId && !b.locked);
      if (!box) {
        showToast('Caixa já foi aberta.');
        return prev;
      }

      // A caixinha sempre representa uma pessoa específica (personId/personName)
      // Impede que alguém tire a si mesmo
      if (box.personId === currentPersonId) {
        showToast('Você não pode tirar você mesmo. Escolha outra caixinha.');
        return prev;
      }

      const assigned = box.personName;
      const friendId = box.personId;

      box.revealedName = assigned;
      box.locked = true;
      box.sorteado = true; // marca como sorteado
      next.boxes = next.boxes.filter(b => !b.sorteado); // remove da timeline
      next.revealedLog.push({ boxId: box.id, name: assigned, revealerName: selector });
      // Atualiza nomes restantes removendo o amigo sorteado
      next.remainingNames = next.remainingNames.filter((n) => n !== assigned);

      // Atualiza status de "sorteado" no Supabase para o AMIGO SORTEADO (friendId)
      // na tabela "sorteados"
      supabase
        .from('sorteados')
        .update({ sorteado: true })
        .eq('id', friendId)
        .then(() => {
          setSorteados(ps => ps.map(p =>
            p.id === friendId ? { ...p, sorteado: true } : p
          ));
        });
      setModalFriend(assigned);
      showToast('Presente revelado com sucesso.');
      setHasRevealed(true);
      return next;
    });

    // Marca no banco que esta pessoa participou (votou)
    // somente depois que ela realmente abriu uma caixinha.
    if (currentPersonId) {
      try {
        await supabase
          .from('participantes')
          .update({ votou: true })
          .eq('id', currentPersonId);

        const { data, error } = await supabase
          .from('participantes')
          .select('id, nome, votou')
          .order('id', { ascending: true });

        if (!error && data) {
          setParticipantes(data as Participante[]);
        }
      } catch (error) {
        console.error('Erro ao atualizar participantes após revelar amigo:', error);
      }
    }

    // Após atualizar o estado local, busca novamente a base de "sorteados" para
    // manter as caixinhas alinhadas ao Supabase (somente quem ainda não foi sorteado)
    try {
      const { data, error } = await supabase
        .from('sorteados')
        .select('id, nome, sorteado')
        .order('id', { ascending: true });

      if (!error && data) {
        const sorteadosData = data as Sorteado[];
        setSorteados(sorteadosData);
        setState(prev => {
          const disponiveis = sorteadosData.filter(p => !p.sorteado && (!currentPersonId || p.id !== currentPersonId));
          const rebuilt = createInitialStateFromSorteados(disponiveis);
          // preserva o histórico já revelado nesta sessão
          return {
            ...rebuilt,
            revealedLog: prev.revealedLog,
          };
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar sorteados e caixas após revelar amigo:', error);
    }
  }

  const canUseGrid = hasSelectedPerson && !hasRevealed;
  const allSorted = remainingCount === 0 && participantes.length > 0;

  // fundo azul clarinho e título destacado
  // Fase 1: tela tipo "login" para escolher quem é
  if (!hasSelectedPerson) {
    return (
      <div
        style={{
          ...styles.body,
          minHeight: '100vh',
          backgroundAttachment: 'fixed',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={styles.loginCard}>
          <div style={styles.loginBadgeRow}>
            <span style={styles.loginBadge}>🎄 Amigo Secreto da Família 🎄</span>
            <span style={styles.loginYear}>Natal {new Date().getFullYear()}</span>
          </div>
          <h1 style={styles.loginTitle}>Natal de Chocolate</h1>
          {allSorted ? (
            <p style={styles.loginSubtitle}>
              Todos já foram sorteados. Esta página agora é só para lembrar da festa.
            </p>
          ) : (
            <>
              <p style={styles.loginSubtitle}>
                Em 3 passos bem simples:
              </p>
              <ol style={{ margin: '4px 0 10px', paddingLeft: 18, fontSize: 13, color: '#4b5563' }}>
                <li>Escolha seu nome na lista.</li>
                <li>Clique em "Começar".</li>
                <li>Na próxima tela, toque em uma caixinha.</li>
              </ol>
            </>
          )}

          {!allSorted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                style={{
                  padding: '10px 14px',
                  fontSize: 16,
                  borderRadius: 10,
                  border: '1px solid #b3d8ff',
                }}
                value={pendingPersonId ?? ""}
                onChange={handleNameChange}
              >
                <option value="">Selecione quem você é...</option>
                {participantes
                  .filter((p) => !p.votou)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
              </select>
              <button
                style={{ ...styles.button, background: '#16a34a', color: '#fff', width: '100%' }}
                onClick={handleNameConfirm}
                disabled={!pendingPersonId}
              >
                2️⃣ Começar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fase 2: página de amigos / caixinhas
  return (
    <div style={{
      ...styles.body,
      minHeight: '100vh',
      backgroundAttachment: 'fixed',
      position: 'relative'
    }}>
      {/* Efeito de neve natalina */}
      <div style={{position:'fixed',zIndex:0,top:0,left:0,width:'100vw',height:'100vh',pointerEvents:'none',background:'repeating-linear-gradient(0deg,rgba(255,255,255,0.07),rgba(255,255,255,0.07) 2px,transparent 2px,transparent 8px)'}}></div>
      <header style={styles.header}>
        <div style={styles.title}>
          {/* Header destacado com caixa de fundo */}
          <div style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 14px 40px rgba(15,23,42,0.18)',
            padding: '18px 24px 12px 24px',
            margin: '32px auto 24px auto',
            maxWidth: 600,
            border: '2px solid rgba(220,38,38,0.18)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8
          }}>
            <h1 style={{
              ...styles.h1,
              color: '#991b1b',
              textShadow: '0 3px 16px rgba(220,38,38,0.35)',
              background: 'none',
              WebkitBackgroundClip: 'unset',
              WebkitTextFillColor: 'unset',
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: '-.01em',
              padding: 0,
              margin: 0
            }}>
             🎁 Amigo Secreto — Natal de Chocolate
            </h1>
            {currentName && (
              <p style={{ margin: 4, fontSize: 13, color: '#6b7280' }}>
                2️⃣ Você é: <strong>{currentName}</strong>
              </p>
            )}
            {currentName && !hasRevealed && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: 'linear-gradient(90deg,#0f766e,#047857)',
                  border: '1px solid rgba(16,185,129,0.6)',
                  color: '#ecfdf5',
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: 'center',
                  boxShadow: '0 10px 25px rgba(5,150,105,0.4)',
                }}
              >
                3️⃣ Agora clique em uma caixinha de presente para descobrir seu amigo de chocolate.
              </div>
            )}
            {currentName && hasRevealed && (
              <div
                style={{
                  marginTop: 10,
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: 'linear-gradient(90deg,#f97316,#ea580c)',
                  border: '1px solid rgba(249,115,22,0.8)',
                  color: '#fff7ed',
                  fontSize: 14,
                  fontWeight: 600,
                  textAlign: 'center',
                  boxShadow: '0 10px 25px rgba(248,113,22,0.5)',
                }}
              >
                Parabéns, {currentName}! Guarde o nome do seu amigo com muito carinho.
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Lista de todos os participantes, mostrando quem já jogou */}
        <section style={{
          background: 'linear-gradient(135deg,#ffffff,#fef3f2)',
          borderRadius: 12,
          boxShadow: '0 12px 30px rgba(15,23,42,0.18)',
          padding: '16px 20px',
          margin: '0 auto 24px auto',
          maxWidth: 480,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
        }}>
          <h3 style={{width:'100%',textAlign:'center',margin:'0 0 8px 0',fontSize:18,color:'#b91c1c',textTransform:'uppercase',letterSpacing:'.08em'}}>Participantes</h3>
          <div style={{
            width:'100%',
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center',
            margin:'0 0 8px 0',
            flexWrap:'wrap',
            gap:8,
          }}>
         
            <span style={{
              background:'rgba(22,163,74,0.06)',
              color:'#166534',
              borderRadius:12,
              padding:'4px 14px',
              fontWeight:600,
              fontSize:14,
              whiteSpace:'nowrap',
            }}>
              Restantes: {remainingCount} | Revelados: {lockedCount}/{participantes.length}
            </span>
          </div>
           
          {participantes.map((p) => (
            <span
              key={p.nome}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                background: p.votou ? 'rgba(22,163,74,0.15)' : 'rgba(185,28,28,0.06)',
                color: p.votou ? '#166534' : '#6b7280',
                fontWeight: p.votou ? 700 : 400,
                fontSize: 15,
                border: p.votou ? '2px solid #1976d2' : '1px solid #b3d8ff',
                opacity: p.votou ? 1 : 0.7,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {p.votou ? '🎁' : '⏳'} {p.nome}
            </span>
          ))}
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
        <section
          className="app-grid"
          style={{
            ...styles.grid,
            opacity: canUseGrid ? 1 : 0.5,
            pointerEvents: canUseGrid ? 'auto' : 'none',
          }}
        >
          {remainingGifts === 0 || state.boxes.length === 0 ? (
            <div style={styles.revealedEmpty}>Todos já têm seus amigos. Parabéns!</div>
          ) : (
            state.boxes.map((box) => {
              const log = state.revealedLog.find((r) => r.boxId === box.id);
              const openedForMe =
                box.locked && log && log.revealerName && currentName && log.revealerName === currentName;
              const isMyBox = log && log.revealerName === currentName;
              return (
                <div
                  key={box.id}
                  style={{
                    ...styles.card,
                    ...(box.locked ? styles.cardLocked : null),
                    ...(isMyBox ? styles.cardSelected : null),
                  }}
                  onClick={() => confirmReveal(box.id)}
                  role="button"
                  tabIndex={0}
                  title={box.locked ? "Já aberto" : "Abrir presente"}
                >
                  <div className="giftwrap">
                    <div
                      className="gift"
                      style={{
                        position: 'relative',
                        background:
                          giftColors[state.boxes.indexOf(box) % giftColors.length],
                        borderRadius: 16,
                      }}
                    >
                      <GiftSvg key={box.id} />
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
                        <p style={styles.reveal}>
                          {box.locked ? "Presente aberto (privado)" : "Abrir presente 🎁"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {hasRevealed && (
          <div style={{textAlign:'center',marginTop:4,fontSize:13,color:'#6b7280'}}>
            Você já revelou seu amigo de chocolate. Agora é só guardar o segredo e fechar a página quando quiser.
          </div>
        )}

        {/* Removed the 'Resultados' section */}
        {/* <section style={styles.panel} className="panel">
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
          <p style={styles.footerNote}>
            Os resultados ficam salvos apenas em memória nesta sessão.
          </p>
        </section> */}
      </main>

      {toast && <div style={styles.toast}>{toast}</div>}
      {modalFriend && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{marginTop:0,marginBottom:8}}>Parabéns!</h2>
            <p style={{fontSize:16,margin:'8px 0'}}>Seu amigo de chocolate é:</p>
            <p style={{fontSize:22,fontWeight:800,margin:'8px 0',color:'#c0473d'}}>{modalFriend}</p>
            <p style={{fontSize:13,color:'#6b7280',marginTop:12}}>
              Guarde esse nome com carinho. Depois é só fechar esta janela ou a página.
            </p>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
              <button
                style={{...styles.button,background:'#1f8a51',color:'#fff'}}
                onClick={() => setModalFriend(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
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
  main: {
    flex: 1,
    width: '100%',
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px clamp(12px, 4vw, 32px) 32px",
    display: "grid",
    gap: 20,
  },
  grid: { display: "grid", gap: 16 },
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
  cardSelected: {
    border: '3px solid #1976d2',
    boxShadow: '0 0 0 3px #b3d8ff',
    position: 'relative',
    zIndex: 2,
  },
  giftwrap: {
    height: 150,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    background: "linear-gradient(135deg, #fffaf8, #fff7f3)",
    position: "relative",
  },
  gift: {
    width: "100%",
    maxWidth: 320,
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
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
  loginCard: {
    background: 'linear-gradient(145deg,#ffffff,#fff7ed)',
    borderRadius: 18,
    padding: 22,
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 20px 45px rgba(15,23,42,0.35)',
    border: '1px solid rgba(220,38,38,0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  loginBadgeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  loginBadge: {
    padding: '4px 10px',
    borderRadius: 999,
    background: 'linear-gradient(90deg,#b91c1c,#ea580c)',
    color: '#fef2f2',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.09em',
    textTransform: 'uppercase',
    boxShadow: '0 6px 16px rgba(185,28,28,0.5)',
  },
  loginYear: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
  },
  loginTitle: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    color: '#991b1b',
    textAlign: 'center',
  },
  loginSubtitle: {
    margin: 0,
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  loginInfo: {
    margin: 0,
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
};
