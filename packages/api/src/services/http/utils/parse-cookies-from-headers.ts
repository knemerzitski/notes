type Headers = Readonly<Record<string, string | undefined>>;
type Cookies = Record<string, string>;

export function parseCookiesFromHeaders(
  headers: Headers,
  /**
   * @default 'cookie'
   */
  key = 'cookie'
): Cookies {
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
