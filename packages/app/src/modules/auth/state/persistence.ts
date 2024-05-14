import { AuthProvider, ClientSession } from '../../../__generated__/graphql';

const SESSION_CONTEXT_KEY = 'session_context';

interface SessionContext {
  currentSession: ClientSession;
  sessions: Record<string, ClientSession>;
}

export function readSessionContext(): SessionContext | null {
  const sessionContextStr = localStorage.getItem(SESSION_CONTEXT_KEY);
  if (!sessionContextStr) return null;

  const rawSessionCtx: unknown = JSON.parse(sessionContextStr);
  if (!rawSessionCtx || typeof rawSessionCtx !== 'object') return null;

  let sessions: SessionContext['sessions'] = {};
  if ('sessions' in rawSessionCtx) {
    sessions = parseSessions(rawSessionCtx.sessions);
  }

  if (
    'currentId' in rawSessionCtx &&
    typeof rawSessionCtx.currentId === 'string' &&
    rawSessionCtx.currentId.trim().length > 0
  ) {
    const session = sessions[rawSessionCtx.currentId];
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

function parseSessions(rawObj: unknown): SessionContext['sessions'] {
  if (!Array.isArray(rawObj)) return {};

  const sessions: SessionContext['sessions'] = {};
  for (const anyValue of rawObj) {
    const rawValue: unknown = anyValue;
    if (!rawValue || typeof rawValue !== 'object') continue;

    if (
      !('id' in rawValue) ||
      typeof rawValue.id !== 'string' ||
      rawValue.id.trim().length === 0
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

    if (!('authProviderEntries' in rawValue)) {
      continue;
    }

    sessions[rawValue.id] = {
      id: rawValue.id,
      isExpired: 'isExpired' in rawValue && !!rawValue.isExpired,
      displayName: rawValue.displayName,
      email: rawValue.email,
      authProviderEntries: parseAuthProviderEntries(rawValue.authProviderEntries),
    };
  }

  return sessions;
}

function parseAuthProviderEntries(rawObj: unknown): ClientSession['authProviderEntries'] {
  if (!Array.isArray(rawObj)) return [];

  const entries: ClientSession['authProviderEntries'] = [];
  for (const anyValue of rawObj) {
    const rawValue: unknown = anyValue;
    if (!rawValue || typeof rawValue !== 'object') continue;

    if (
      !('provider' in rawValue) ||
      typeof rawValue.provider !== 'string' ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      rawValue.provider !== AuthProvider.Google
    ) {
      continue;
    }

    if (
      !('id' in rawValue) ||
      typeof rawValue.id !== 'string' ||
      rawValue.id.trim().length === 0
    ) {
      continue;
    }

    entries.push({
      provider: rawValue.provider,
      id: rawValue.id,
    });
  }

  return entries;
}

export function saveSessionContext(ctx: SessionContext) {
  localStorage.setItem(
    SESSION_CONTEXT_KEY,
    JSON.stringify({
      currentId: ctx.currentSession.id,
      sessions: Object.values(ctx.sessions),
    })
  );
}

export function deleteSessionContext() {
  localStorage.removeItem(SESSION_CONTEXT_KEY);
}
