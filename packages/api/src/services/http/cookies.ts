const SECURE_SET_COOKIE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

interface ModifiedValue {
  /**
   * Null value signifies a deleted cookie
   */
  value: string | null;
  secure: boolean;
}

interface UpdateResponseOptions {
  /**
   * Set cookie with HttpOnly and Strict option
   * @default false
   */
  secure?: boolean;
}

/**
 * Read or modify cookies
 */
export class Cookies {
  private readonly modifiedCookies: Record<string, ModifiedValue> = {};

  private _isModified = false;
  /**
   * Cookies have been modified
   */
  get isModified() {
    return this._isModified;
  }

  constructor(private readonly cookies: Readonly<Record<string, string>> = {}) {}

  private modify(key: string, value: string | null, options?: UpdateResponseOptions) {
    if (value === null && !(key in this.cookies)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.modifiedCookies[key];
    } else if (this.get(key) !== value) {
      this.modifiedCookies[key] = {
        value,
        secure: options?.secure ?? false,
      };
    } else {
      return;
    }

    this._isModified = true;
  }

  update(key: string, value: string, options?: UpdateResponseOptions) {
    this.modify(key, value, options);
  }

  delete(key: string, options?: UpdateResponseOptions) {
    this.modify(key, null, options);
  }

  get(key: string): string | undefined {
    // Modified values have priority
    const modifiedValue = this.modifiedCookies[key];
    if (modifiedValue) {
      return modifiedValue.value ?? undefined;
    }

    return this.cookies[key];
  }

  getHeaderValue(): string {
    const cookies = { ...this.cookies };

    for (const [key, { value }] of Object.entries(this.modifiedCookies)) {
      if (value != null) {
        cookies[key] = value;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete cookies[key];
      }
    }

    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join(';');
  }

  getMultiValueHeadersSetCookies(): string[] {
    return Object.entries(this.modifiedCookies).map(([key, { value, secure }]) => {
      let setCookieValue = `${key}=${value ?? ''}`;

      if (secure) {
        setCookieValue += `; HttpOnly; SameSite=Strict${SECURE_SET_COOKIE}`;

        const isUpdateCookieValue = value != null;
        if (isUpdateCookieValue) {
          setCookieValue += '; Path=/';
        } else {
          // Deleted
          setCookieValue += '; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
      }

      return setCookieValue;
    });
  }
}
