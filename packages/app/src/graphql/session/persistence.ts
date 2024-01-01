import { SavedSession, SessionProfile } from '../__generated__/graphql';

const SESSIONS_KEY = 'session_sessions';
const CURRENT_SESSION_INDEX_KEY = 'session_currentIndex';

export function readSessionProfiles(): SessionProfile[] {
  const sessionsStr = localStorage.getItem(SESSIONS_KEY);
  if (!sessionsStr) return [];
  return JSON.parse(sessionsStr) as SessionProfile[];
}

export function saveSessionProfiles(sessions: SessionProfile[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function readCurrentSessionIndex(): number {
  const currentUserIndexStr = localStorage.getItem(CURRENT_SESSION_INDEX_KEY);
  if (!currentUserIndexStr) return Number.NaN;
  return Number.parseInt(currentUserIndexStr);
}

export function saveCurrentSessionIndex(index: number) {
  localStorage.setItem(CURRENT_SESSION_INDEX_KEY, JSON.stringify(index));
}

export function deleteCurrentSessionIndex() {
  localStorage.removeItem(CURRENT_SESSION_INDEX_KEY);
}

export function readCurrentSession(): SavedSession | null {
  const sessions = readSessionProfiles();
  let index = readCurrentSessionIndex();
  if (Number.isNaN(index) || index < 0 || index >= sessions.length) {
    index = 0;
  }
  if (index >= sessions.length) {
    return null;
  }

  const profile = sessions[index];

  return {
    index,
    profile,
  };
}
