/**
 * Local progress & bookmarks for Learning module (localStorage).
 */
export type ProgressMap = Record<string, { read: boolean; bookmarked?: boolean; lastOpened?: number; }>;

const KEY = "learning.progress.v1";

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

export function saveProgress(p: ProgressMap) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

export function markRead(id: string) {
  const p = loadProgress();
  p[id] = { ...(p[id]||{}), read: true, lastOpened: Date.now() };
  saveProgress(p);
}

export function toggleBookmark(id: string) {
  const p = loadProgress();
  p[id] = { ...(p[id]||{}), bookmarked: !p[id]?.bookmarked, lastOpened: Date.now() };
  saveProgress(p);
}

export function getStats(ids: string[]) {
  const p = loadProgress();
  let read = 0, bookmarked = 0;
  ids.forEach(id => {
    if (p[id]?.read) read++;
    if (p[id]?.bookmarked) bookmarked++;
  });
  return { read, bookmarked };
}
