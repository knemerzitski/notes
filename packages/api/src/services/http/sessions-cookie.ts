import { wrapArray } from '../../../../utils/src/array/wrap-array';

import { SessionsCookieModel } from '../../models/http/sessions-cookie';
import { objectIdToStr } from '../../mongodb/utils/objectid';

import { Cookies } from './cookies';
import { parseSimpleRecord, serializeSimpleRecord } from './utils/simple-str-record';

type UserId = NonNullable<Parameters<typeof objectIdToStr>[0]>;
type CookieId = string;

/**
 * Sessions that are stored in a cookie
 * Cookie is updated whenever a session changes
 */
export class SessionsCookie {
  private readonly cookies;
  private readonly model;

  private readonly key;

  constructor(
    {
      cookies,
      model,
    }: {
      readonly cookies?: Cookies;
      readonly model?: SessionsCookieModel;
    },
    options?: {
      /**
       * Cookie key used for sessions
       */
      key?: string;
    }
  ) {
    this.key = options?.key ?? 'Sessions';

    this.cookies = cookies;
    this.model = model ?? new SessionsCookieModel();
  }

  updateModelFromCookies() {
    if (!this.cookies) {
      return;
    }
    this.model.cookieIdByUserId = parseSimpleRecord(this.cookies.get(this.key));
  }

  update(userId: UserId, newCookieId: CookieId) {
    const userIdStr = objectIdToStr(userId);

    const existingCookieId = this.model.cookieIdByUserId[userIdStr];
    if (existingCookieId === newCookieId) {
      return;
    }

    this.model.cookieIdByUserId[userIdStr] = newCookieId;

    this.cookies?.update(this.key, serializeSimpleRecord(this.model.cookieIdByUserId), {
      secure: true,
    });
  }

  delete(userIdOrArr: UserId | UserId[]) {
    let isModified = false;
    for (const userId of wrapArray(userIdOrArr)) {
      const userIdStr = objectIdToStr(userId);
      if (!(userIdStr in this.model.cookieIdByUserId)) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.model.cookieIdByUserId[userIdStr];
      isModified = true;
    }

    if (isModified) {
      const value = serializeSimpleRecord(this.model.cookieIdByUserId);
      if (value.length === 0) {
        this.cookies?.delete(this.key, {
          secure: true,
        });
      } else {
        this.cookies?.update(
          this.key,
          serializeSimpleRecord(this.model.cookieIdByUserId),
          {
            secure: true,
          }
        );
      }
    }
  }

  clear() {
    if (Object.keys(this.model.cookieIdByUserId).length === 0) {
      return;
    }

    this.model.cookieIdByUserId = {};

    this.cookies?.delete(this.key, {
      secure: true,
    });
  }

  /**
   * @returns Session `cookieId` or undefined if user has no session
   */
  get(userId: UserId): CookieId | undefined {
    const userIdStr = objectIdToStr(userId);

    return this.model.cookieIdByUserId[userIdStr];
  }

  getUserIds(): string[] {
    return Object.keys(this.model.cookieIdByUserId);
  }
}
