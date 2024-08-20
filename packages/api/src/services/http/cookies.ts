const SECURE_SET_COOKIE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

interface CookiesParams {
  sessions: Record<string, string>;
}

export interface SerializedCookies {
  sessions: Cookies['sessions'];
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

  static parseFromHeaders(headers: Readonly<Record<string, string | undefined>>) {
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
  readonly sessions: Record<string, string>;

  constructor(config: CookiesParams) {
    this.sessions = config.sessions;
  }

  setSession(userId: string, cookieId: string) {
    this.sessions[userId] = cookieId;
  }

  deleteSession(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.sessions[userId];
  }

  /**
   * Only keep sessions defined in {@link userIds}.
   */
  filterSessions(userIds: string[]) {
    for (const existingUserId of Object.keys(this.sessions)) {
      if (!userIds.includes(existingUserId)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.sessions[existingUserId];
      }
    }
  }

  /**
   * Remembers session in http-only cookie. \
   * Assigns 'Set-Cookie' values to {@link multiValueHeaders} to match {@link sessions}.
   */
  setCookieHeadersUpdate(multiValueHeaders: Record<string, unknown[]>) {
    if (!('Set-Cookie' in multiValueHeaders)) {
      multiValueHeaders['Set-Cookie'] = [];
    }
    multiValueHeaders['Set-Cookie'].push(
      `${Cookies.SESSIONS_KEY}=${Object.entries(this.sessions)
        .map(([key, id]) => `${key}:${id}`)
        .join(',')}; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Path=/`
    );
  }

  /**
   * Deletes session from http-only cookie. \
   * Assigns expired 'Set-Cookie' values to {@link multiValueHeaders} to clear relevant cookies.
   */
  static setCookieHeadersClear(multiValueHeaders: Record<string, unknown[]>) {
    if (!('Set-Cookie' in multiValueHeaders)) {
      multiValueHeaders['Set-Cookie'] = [];
    }

    multiValueHeaders['Set-Cookie'].push(
      `${this.SESSIONS_KEY}=; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
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
