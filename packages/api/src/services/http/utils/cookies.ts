type Headers = Readonly<Record<string, string | undefined>>;
type Cookies = Record<string, string>;

export function parseCookiesFromHeaders(
  headers: Headers,
  /**
   * @default 'cookie'
   */
  key = 'cookie'
) {
  const cookies = headers[key];
  if (!cookies) {
    return {};
  }
  return parseCookieValue(cookies);
}

export function parseCookieValue(value: string): Cookies {
  const result: Record<string, string> = {};
  for (const cookieEntryStr of value.split(';')) {
    const [name, value] = cookieEntryStr.split('=', 2);
    if (name && value) {
      result[name.trim()] = value.trim();
    }
  }

  return result;
}

export function serializeCookieValue(cookies: Cookies): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join(';');
}
