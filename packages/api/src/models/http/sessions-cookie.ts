import { coerce, instance, object, record, string, unknown } from 'superstruct';

const SessionsCookieModelStruct = object({
  cookieIdByUserId: record(string(), string()),
});

export class SessionsCookieModel {
  constructor(public cookieIdByUserId: Record<string, string> = {}) {}
}

export const SessionsCookieModelInstanceStruct = coerce(
  instance(SessionsCookieModel),
  unknown(),
  (value) => {
    const parsedValue = SessionsCookieModelStruct.mask(value);
    return new SessionsCookieModel(parsedValue.cookieIdByUserId);
  },
  (value) => SessionsCookieModelStruct.maskRaw(value)
);
