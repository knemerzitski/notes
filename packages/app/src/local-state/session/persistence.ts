import { SavedSession } from '../../__generated__/graphql';

const SESSION_CONTEXT_KEY = 'session_context';

interface SessionContext {
  currentSession: SavedSession;
  sessions: Record<string, SavedSession>;
}

export function readSessionContext(): SessionContext | null {
  const sessionContextStr = localStorage.getItem(SESSION_CONTEXT_KEY);
  if (!sessionContextStr) return null;

  const rawSessionCtx: unknown = JSON.parse(sessionContextStr);
  if (!rawSessionCtx || typeof rawSessionCtx !== 'object') return null;

  let sessions: SessionContext['sessions'] = {};
  if ('sessions' in rawSessionCtx) {
    sessions = parseSavedSessions(rawSessionCtx.sessions);
  }

  if (
    'currentKey' in rawSessionCtx &&
    typeof rawSessionCtx.currentKey === 'string' &&
    rawSessionCtx.currentKey.trim().length > 0
  ) {
    const session = sessions[rawSessionCtx.currentKey];
    if (session) {
      return {
        currentSession: session,
        sessions,
      };
    }
  }

  const firstKey = Object.keys(sessions)[0];
  if (!firstKey) return null;
  const firstSession = sessions[firstKey];
  if (!firstSession) return null;

  return {
    currentSession: firstSession,
    sessions,
  };
}

function parseSavedSessions(rawObj: unknown): SessionContext['sessions'] {
  if (!Array.isArray(rawObj)) return {};

  const sessions: SessionContext['sessions'] = {};
  for (const anyValue of rawObj) {
    const rawValue: unknown = anyValue;
    if (!rawValue || typeof rawValue !== 'object') continue;

    if (
      !('key' in rawValue) ||
      typeof rawValue.key !== 'string' ||
      rawValue.key.trim().length === 0
    ) {
      continue;
    }

    if (
      !('displayName' in rawValue) ||
      typeof rawValue.displayName !== 'string' ||
      rawValue.displayName.trim().length === 0
    ) {
      continue;
    }

    if (
      !('email' in rawValue) ||
      typeof rawValue.email !== 'string' ||
      rawValue.email.trim().length === 0
    ) {
      continue;
    }

    sessions[rawValue.key] = {
      key: rawValue.key,
      displayName: rawValue.displayName,
      email: rawValue.email,
      isExpired: 'isExpired' in rawValue && !!rawValue.isExpired,
    };
  }

  return sessions;
}

export function saveSessionContext(ctx: SessionContext) {
  localStorage.setItem(
    SESSION_CONTEXT_KEY,
    JSON.stringify({
      currentKey: ctx.currentSession.key,
      sessions: Object.values(ctx.sessions),
    })
  );
}

export function deleteSessionContext() {
  localStorage.removeItem(SESSION_CONTEXT_KEY);
}
