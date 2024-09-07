import { QueryDeep } from '../query';
import { isMongoPrimitive } from './is-mongo-primitive';

export function valueToQuery<T>(value: T): QueryDeep<T> {
  if (isMongoPrimitive(value)) {
    return 1 as QueryDeep<T>;
  }

  if (Array.isArray(value)) {
    return valueToQuery(value[0]) as QueryDeep<T>;
  }

  return Object.entries(value as object).reduce<Record<string, unknown>>(
    (result, [subKey, subValue]) => {
      result[subKey] = valueToQuery(subValue);

      return result;
    },
    {}
  ) as QueryDeep<T>;
}
