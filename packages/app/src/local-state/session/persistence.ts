import { SavedSession } from '../__generated__/graphql';

const SESSIONS_KEY = 'session_sessions';
const CURRENT_SESSION_INDEX_KEY = 'session_currentIndex';

export function readSessions(): SavedSession[] {
  const sessionsStr = localStorage.getItem(SESSIONS_KEY);
  if (!sessionsStr) return [];
  return JSON.parse(sessionsStr) as SavedSession[];
}

export function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function deleteSessions() {
  localStorage.removeItem(SESSIONS_KEY);
}

export function readCurrentSessionIndex(): number | null {
  const currentUserIndexStr = localStorage.getItem(CURRENT_SESSION_INDEX_KEY);
  if (!currentUserIndexStr) return null;

  const index = Number.parseInt(currentUserIndexStr);

  return !Number.isNaN(index) ? index : null;
}

export function saveCurrentSessionIndex(index: number) {
  localStorage.setItem(CURRENT_SESSION_INDEX_KEY, JSON.stringify(index));
}

export function deleteCurrentSessionIndex() {
  localStorage.removeItem(CURRENT_SESSION_INDEX_KEY);
}
