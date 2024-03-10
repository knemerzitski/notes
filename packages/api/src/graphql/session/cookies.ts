/**
 * @param key
 * @default "cookie"
 */
export function parseCookiesFromHeaders(
  headers: Readonly<Record<string, string | undefined>>,
  key = 'cookie'
) {
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
