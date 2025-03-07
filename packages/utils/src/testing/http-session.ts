import { FetchFn } from './types';

export class HttpSession {
  private cookies: Record<string, string>;
  private headers: Record<string, string>;
  private fetchFn: FetchFn;

  constructor(options: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    fetchFn: FetchFn;
  }) {
    this.cookies = { ...options.cookies };
    this.headers = { ...options.headers };
    this.fetchFn = options.fetchFn;
  }

  async fetch(options: Parameters<FetchFn>[0]): ReturnType<FetchFn> {
    const res = await this.fetchFn({
      ...options,
      headers: {
        ...options.headers,
        ...this.getHeaders(),
      },
    });

    this.processSetCookie(res.headers.getSetCookie());

    return res;
  }

  getHeaders() {
    return {
      ...this.headers,
      Cookie: this.getCookieString(),
    };
  }

  reset() {
    this.cookies = {};
  }

  setCookie(key: string, value: string) {
    this.cookies[key] = value;
  }

  setHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  private getCookieString() {
    return Object.entries(this.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  private processSetCookie(setCookies: string[]) {
    for (const setCookie of setCookies) {
      this.updateCookie(this.parseSetCookie(setCookie));
    }
  }

  private updateCookie(keyValue: readonly [string, string] | undefined) {
    if (!keyValue) return;
    const [key, value] = keyValue;
    if (value.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.cookies[key];
    }
    this.cookies[key] = value;
  }

  private parseSetCookie(nameValue: string) {
    const eqIndex = nameValue.indexOf('=');
    if (eqIndex === -1) return;

    const name = nameValue.slice(0, eqIndex).trim();
    if (name.length === 0) return;

    const valueMore = nameValue.slice(eqIndex + 1);

    const semiIndex = valueMore.indexOf(';');
    if (semiIndex === -1) {
      return [name, valueMore.trim()] as const;
    }

    const value = valueMore.slice(0, semiIndex).trim();

    return [name, value] as const;
  }
}
