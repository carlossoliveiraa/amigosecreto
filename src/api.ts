type RevealResult = {
  assignedName?: string;
  error?: string;
};

// Simple in-memory mock for revealBox used for local testing.
// This keeps a process-local pool of names and returns a random one on each call.
const NAMES_POOL: string[] = [
  "Adilson","Beatriz","Beto","Carlinhos","Eduardo","Felipe","Gleice","Guilherme",
  "Jessica","Joao Batista","Lais","Leonardo","Leticia","Luiza",
  "Miguel","Moises","Murilo","Olga","Pri","Rosana","Solange","Vinicius"
];

function pickRandomAndRemove(list: string[]): string | null {
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  const item = list[idx];
  list.splice(idx, 1);
  return item;
}

export async function revealBox(_boxId: string, _revealerName: string, _revealerPhone: string): Promise<RevealResult> {
  // simulate small network delay
  await new Promise((r) => setTimeout(r, 250));
  const assigned = pickRandomAndRemove(NAMES_POOL);
  if (!assigned) return { error: 'Nenhum nome disponível' };
  return { assignedName: assigned };
}
