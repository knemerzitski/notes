import { Connection } from 'mongoose';

import { isArray } from '~common/isArray';

import { SessionSchema } from './mongoose';

/**
 * Current identity/session accessing resources.
 */
export interface Identity {
  /**
   * MongoDB user ID
   */
  userId: string;
  /**
   * MongoDB session ID
   */
  sessionId: string;
  /**
   * index of active session in sessions array
   * sessions[sessionIndex] = sessionId
   */
  sessionIndex: number;
  /**
   * Array of stored sessions
   */
  sessions: string[];
}

export async function getIdentityFromHeaders(
  mongoose: Connection,
  headers: Readonly<Record<string, string | undefined>>
) {
  return getIdentityFromCookies(mongoose, parseCookiesFromHeaders(headers));
}

async function getIdentityFromCookies(
  mongoose: Connection,
  cookies: Readonly<Record<string, string>>
): Promise<Identity | undefined> {
  if (!('ActiveSessionIndex' in cookies)) {
    return; // Invalid session index
  }

  const activeSessionIndex = Number.parseInt(cookies.ActiveSessionIndex);
  if (Number.isNaN(activeSessionIndex) || activeSessionIndex < 0) {
    return; // Invalid session index
  }

  const sessions = cookies.Sessions?.split(',') ?? [];
  if (!isArray(sessions) || activeSessionIndex >= sessions.length) {
    return; // Invalid sessions or index is too high
  }

  const sessionId = sessions[activeSessionIndex];
  if (typeof sessionId !== 'string') {
    return; // Session ID is not string
  }

  const Session = mongoose.model<SessionSchema>('Session');

  const session = await Session.findById(sessionId);
  if (!session) {
    return; // Session doesn't exist
  }

  return {
    userId: String(session.userId),
    sessionId: String(session._id),
    sessionIndex: activeSessionIndex,
    sessions,
  };
}

function parseCookiesFromHeaders(headers: Readonly<Record<string, string | undefined>>) {
  if (!('cookie' in headers) || !headers.cookie) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const cookie of headers.cookie.split(';')) {
    const [name, value] = cookie.split('=', 2);
    if (name && value) {
      result[name.trim()] = value.trim();
    }
  }

  return result;
}
