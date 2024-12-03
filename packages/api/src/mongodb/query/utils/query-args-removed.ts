import mapObject, { mapObjectSkip } from 'map-obj';

import { isQueryArgField } from '../merge-queries';
import { QueryObjectDeep } from '../query';

/**
 * @returns Query that has args removed shallowly.
 */
export function queryArgsRemoved<T extends object>(
  query: QueryObjectDeep<T>
): QueryObjectDeep<T> {
  return mapObject(query as object, (key, value) => {
    if (isQueryArgField(key)) {
      return mapObjectSkip;
    }
    return [key, value];
  }) as QueryObjectDeep<T>;
}
