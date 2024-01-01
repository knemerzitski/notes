export default function parseCookies(headers: Record<string, string | undefined>) {
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
