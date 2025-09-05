
// v2.8 quiz engine: seedable RNG, adaptive difficulty, anti-guessing shuffles
export type Item = {
  id: string
  question?: string
  prompt?: string
  passage?: string
  section?: string
  options: string[]
  answerIndex: number
  explanation?: string
  rationales?: string[]
  topic?: string
  module?: string
  difficulty?: 'easy'|'medium'|'hard'
}

export type BuildOptions = {
  limit?: number
  ratios?: { easy: number; medium: number; hard: number } // e.g. {easy:0.3, medium:0.5, hard:0.2}
  seed?: number
  adaptive?: boolean
  // ensure we don't preselect correct option
  antiGuessing?: boolean
}

// --------- RNG ---------
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Fisher-Yates shuffle with seed
export function shuffle<T>(arr: T[], seed = 1234): T[] {
  const rng = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle options but preserve correct answer mapping
export function shuffleOptions(item: Item, seed = 1234): Item {
  const idxs = item.options.map((_, i) => i);
  const order = shuffle(idxs, seed);
  const options = order.map(i => item.options[i]);
  const answerIndex = order.indexOf(item.answerIndex);
  const rationales = item.rationales ? order.map(i => item.rationales![i]) : undefined;
  return { ...item, options, answerIndex, rationales };
}

// Filter by difficulty ratios and limit
export function selectByDifficulty(items: Item[], opt: BuildOptions): Item[] {
  const { limit = items.length, ratios = {easy: 0.33, medium: 0.34, hard: 0.33}, seed = 1234 } = opt;
  const easy = items.filter(i => i.difficulty === 'easy');
  const med  = items.filter(i => i.difficulty === 'medium');
  const hard = items.filter(i => i.difficulty === 'hard');

  const targetE = Math.max(0, Math.round(limit * (ratios.easy ?? 0)));
  const targetM = Math.max(0, Math.round(limit * (ratios.medium ?? 0)));
  let taken: Item[] = [];
  taken = taken.concat(shuffle(easy, seed).slice(0, targetE));
  taken = taken.concat(shuffle(med , seed+1).slice(0, targetM));
  const remaining = limit - taken.length;
  taken = taken.concat(shuffle(hard, seed+2).slice(0, remaining));
  return taken;
}

// Adaptive queue: adjusts difficulty based on recent streak
export function buildAdaptiveQueue(items: Item[], seed = 1234) {
  let pool = {
    easy: shuffle(items.filter(i=>i.difficulty==='easy'), seed),
    medium: shuffle(items.filter(i=>i.difficulty==='medium'), seed+1),
    hard: shuffle(items.filter(i=>i.difficulty==='hard'), seed+2),
  }
  let streak = 0;
  let lastDifficulty: 'easy'|'medium'|'hard' = 'medium';

  function next(correct?: boolean): Item | null {
    if (correct === true) streak++;
    else if (correct === false) streak--;
    // adjust difficulty
    if (streak >= 2) {
      lastDifficulty = lastDifficulty === 'medium' ? 'hard' : 'hard';
      streak = 0;
    } else if (streak <= -2) {
      lastDifficulty = lastDifficulty === 'medium' ? 'easy' : 'easy';
      streak = 0;
    }
    // get from pool; fallback to other pools if empty
    let pick: Item|undefined;
    const tryOrder = lastDifficulty === 'hard' ? ['hard','medium','easy'] :
                     lastDifficulty === 'easy' ? ['easy','medium','hard'] :
                     ['medium','easy','hard'];
    for (const d of tryOrder as const) {
      if (pool[d].length) { pick = pool[d].shift(); lastDifficulty = d; break; }
    }
    return pick ?? null;
  }

  return { next };
}

// Build static exam: difficulty mix + seeded option shuffles, anti-guessing
export function buildExam(items: Item[], opt: BuildOptions): Item[] {
  const seed = opt.seed ?? 1234;
  const picked = selectByDifficulty(items, opt);
  const withOpts = picked.map((it, idx) => {
    const i2 = opt.antiGuessing ? shuffleOptions(it, seed + idx) : it;
    return i2;
  });
  return withOpts;
}

// tiny global hook for quick integration/debug
declare global { interface Window { QuizEngine?: any } }
if (typeof window !== 'undefined') {
  (window as any).QuizEngine = { shuffle, shuffleOptions, selectByDifficulty, buildExam, buildAdaptiveQueue };
}
