// =============================================================
// ORVAX · useRankUnlock — detecta level-ups e aciona o overlay.
//
// Persiste em localStorage o último rank visto · se o atual >
// último visto, retorna o rank novo pra mostrar o EvolutionCardOverlay.
//
// Também expõe markSeen() · usado no botão "Guardar carta".
// =============================================================
import { useEffect, useState, useCallback } from 'react';
import { getCurrentRank, RANKS, type Rank } from '../data/ranks';

const LAST_SEEN_KEY = 'orvax_last_seen_rank';
const UNLOCKS_KEY   = 'orvax_unlocks';

interface UnlockMap {
  /** slug → ISO date (curto · "23/04/26") */
  [slug: string]: string;
}

interface Result {
  /** rank atual baseado no XP · sempre presente */
  currentRank: Rank;
  /** rank a ser revelado · null se já está visto ou XP=0 */
  pendingRank: Rank | null;
  /** map persistido das cartas desbloqueadas */
  unlockedMap: UnlockMap;
  /** marca o pendingRank como visto · fecha o overlay */
  markSeen: () => void;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

function todayShort(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}

/**
 * @param currentXp · XP total acumulado
 */
export function useRankUnlock(currentXp: number): Result {
  const currentRank = getCurrentRank(currentXp);

  // Estado · hidrata do localStorage
  const [lastSeen, setLastSeen] = useState<number>(() =>
    loadJSON<number>(LAST_SEEN_KEY, 0)
  );
  const [unlockedMap, setUnlockedMap] = useState<UnlockMap>(() =>
    loadJSON<UnlockMap>(UNLOCKS_KEY, {})
  );

  // Quando o XP cruza um threshold pela primeira vez, registra a data
  useEffect(() => {
    const newlyUnlocked = RANKS.filter(
      r => currentXp >= r.xpRequired && !unlockedMap[r.slug]
    );
    if (newlyUnlocked.length === 0) return;
    const next: UnlockMap = { ...unlockedMap };
    newlyUnlocked.forEach(r => { next[r.slug] = todayShort(); });
    setUnlockedMap(next);
    saveJSON(UNLOCKS_KEY, next);
  }, [currentXp, unlockedMap]);

  // Pending = rank atual ordinal > lastSeen
  const pendingRank = currentRank.ordinal > lastSeen ? currentRank : null;

  const markSeen = useCallback(() => {
    setLastSeen(currentRank.ordinal);
    saveJSON(LAST_SEEN_KEY, currentRank.ordinal);
  }, [currentRank.ordinal]);

  return { currentRank, pendingRank, unlockedMap, markSeen };
}
