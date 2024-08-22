import { ObjectId } from 'mongodb';
import { objectIdToStr } from '../utils/objectid';

const SECURE_SET_COOKIE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

interface CookiesOptions {
  sessions: Record<string, string>;
}

export interface SerializedCookies {
  sessions?: Cookies['sessions'];
}

/**
 * Parsed client cookies as a context. Normally parsed from request headers.
 */
export class Cookies {
  static SESSIONS_KEY = 'Sessions';

  static parse(cookiesRecord: Readonly<Record<string, string>>) {
    return new Cookies({
      sessions: Object.fromEntries(
        cookiesRecord[this.SESSIONS_KEY]
          ?.split(',')
          .map((session) => {
            const [userPublicId = '', cookieId = ''] = session.split(':', 2);
            return [userPublicId, cookieId];
          })
          .filter(isNonEmptyStringPair) ?? []
      ),
    });
  }

  static parseFromHeaders(
    headers: Readonly<Record<string, string | undefined>> | undefined
  ) {
    return this.parse(parseCookiesFromHeaders(headers));
  }

  serialize() {
    return {
      sessions: this.sessions,
    };
  }

  /**
   * All available sessions for current client.
   *
   * Key is User.id \
   * Value is Session.cookieId (NEVER send this in a response body).
   */
  private sessions: Record<string, string>;

  constructor(params?: CookiesOptions) {
    this.sessions = { ...params?.sessions };
  }

  private getSessionKey(userId: ObjectId | string) {
    return userId instanceof ObjectId ? objectIdToStr(userId) : userId;
  }

  setSession(userId: ObjectId | string, cookieId: string) {
    this.sessions[this.getSessionKey(userId)] = cookieId;
  }

  deleteSessionCookieId(userId: ObjectId | string) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.sessions[this.getSessionKey(userId)];
  }

  /**
   * User.id
   */
  getAvailableSessionUserIds() {
    return Object.keys(this.sessions);
  }

  /**
   * Session.cookieId (NEVER send this in a response body)
   */
  getAvailableSessionCookieIds() {
    return Object.values(this.sessions);
  }

  getSessionCookeId(userId: ObjectId | string) {
    return this.sessions[this.getSessionKey(userId)];
  }

  clearSessions() {
    this.sessions = {};
  }

  hasNoSessions() {
    return Object.keys(this.sessions).length === 0;
  }

  /**
   * Only keep sessions defined in {@link userIds}.
   */
  filterSessionsByUserId(userIds: string[]) {
    for (const existingUserId of Object.keys(this.sessions)) {
      if (!userIds.includes(existingUserId)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.sessions[existingUserId];
      }
    }
  }

  /**
   * Remembers session in http-only cookie. \
   * Assigns 'Set-Cookie' values to {@link multiValueHeaders} to match {@link sessions}. \
   * If {@link sessions} is empty then session 'Set-Cookie' is set as expired to clear session value.
   */
  putCookiesToHeaders(multiValueHeaders: Record<string, unknown[]>) {
    if (!('Set-Cookie' in multiValueHeaders)) {
      multiValueHeaders['Set-Cookie'] = [];
    }

    const sessionEntries = Object.entries(this.sessions);
    if (sessionEntries.length > 0) {
      multiValueHeaders['Set-Cookie'].push(
        `${Cookies.SESSIONS_KEY}=${Object.entries(this.sessions)
          .map(([key, id]) => `${key}:${id}`)
          .join(',')}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Path=/`
      );
    } else {
      multiValueHeaders['Set-Cookie'].push(
        `${Cookies.SESSIONS_KEY}=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
      );
    }
  }
}

/**
 * @param key
 * @default "cookie"
 */
export function parseCookiesFromHeaders(
  headers: Readonly<Record<string, string | undefined>> | undefined,
  key = 'cookie'
) {
  if (!headers) return {};

  const cookies = headers[key];
  if (!cookies) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const cookie of cookies.split(';')) {
    const [name, value] = cookie.split('=', 2);
    if (name && value) {
      result[name.trim()] = value.trim();
    }
  }

  return result;
}

function isNonEmptyStringPair(arr: string[]): arr is [string, string] {
  return (
    typeof arr[0] === 'string' &&
    arr[0].length > 0 &&
    typeof arr[1] === 'string' &&
    arr[1].length > 0
  );
}
