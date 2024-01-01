import { ClientSession, LocalSession } from '../__generated__/graphql';

const DEFAULT_SESSIONS: LocalSession[] = [
  {
    __typename: 'LocalSession',
    id: '0',
    displayName: 'Local Account',
  },
];

/**
 *  Is guaranteed to have at least one local session.
 * @returns List of sessions.
 */
export function readSessions(): ClientSession[] {
  const sessionsStr = localStorage.getItem('sessions');
  const sessions = sessionsStr
    ? (JSON.parse(sessionsStr) as ClientSession[])
    : DEFAULT_SESSIONS;
  if (sessions.length === 0) {
    sessions.push(...DEFAULT_SESSIONS);
  }
  return sessions;
}

export function saveSessions(session: ClientSession[]) {
  localStorage.setItem('sessions', JSON.stringify(session));
}

export function readActiveSessionIndex(): number {
  const currentUserIndexStr = localStorage.getItem('activeSessionIndex');
  if (!currentUserIndexStr) return 0;

  const index = Number.parseInt(currentUserIndexStr);
  return Number.isNaN(index) ? 0 : index;
}

function saveActiveSessionIndex(index: number) {
  localStorage.setItem('activeSessionIndex', JSON.stringify(index));
}

export function readNextSessionId() {
  const nextId = localStorage.getItem('nextSessionId') ?? '1';
  const nextIdNr = Number.parseInt(nextId);

  // Increments id on every call
  localStorage.setItem(
    'nextSessionId',
    String(Number.isNaN(nextIdNr) ? 1 : nextIdNr + 1)
  );

  return nextId;
}

export function readActiveSession(): ClientSession {
  const sessions = readSessions();
  const index = readActiveSessionIndex();

  if (0 <= index && index < sessions.length) {
    return sessions[index];
  } else {
    return sessions[0];
  }
}

// Cached active session type
let activeSessionType = readActiveSession().__typename;

export function getActiveSessionType(): ClientSession['__typename'] {
  return activeSessionType;
}

export function setActiveSessionIndex(index: number) {
  if (index < 0) return false;

  const sessions = readSessions();
  if (index >= sessions.length) return false;

  const activeSession = sessions[index];

  activeSessionType = activeSession.__typename;

  saveActiveSessionIndex(index);

  return true;
}
