// Deterministic PRNG so mock data (and therefore screenshots/demos) is stable
// across reloads. This is purely a placeholder-data concern — it must never
// be used for anything resembling clinical scoring.
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed = 42) {
  const rand = mulberry32(seed);
  return {
    float: () => rand(),
    int: (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min,
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)],
    pickMany: <T,>(arr: readonly T[], n: number): T[] => {
      const pool = [...arr];
      const out: T[] = [];
      for (let i = 0; i < n && pool.length > 0; i++) {
        const idx = Math.floor(rand() * pool.length);
        out.push(pool[idx]);
        pool.splice(idx, 1);
      }
      return out;
    },
    bool: (pTrue = 0.5) => rand() < pTrue,
    daysAgo: (max: number, min = 0) => {
      const d = new Date();
      d.setDate(d.getDate() - (Math.floor(rand() * (max - min + 1)) + min));
      d.setHours(Math.floor(rand() * 10) + 7, Math.floor(rand() * 60), 0, 0);
      return d.toISOString();
    },
    minutesAgo: (max: number, min = 0) => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - (Math.floor(rand() * (max - min + 1)) + min));
      return d.toISOString();
    },
  };
}
