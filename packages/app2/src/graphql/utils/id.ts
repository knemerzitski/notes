import { InMemoryCache } from '@apollo/client';

const TYPENAME_SEPARATOR = ':';

export function typenameFromId(id: string): string {
  const idx = id.indexOf(TYPENAME_SEPARATOR);
  if (idx !== -1) {
    return id.substring(0, idx);
  }

  return id;
}

export function typenameToRootId(id: string, cache: InMemoryCache): string {
  return cache.policies.rootIdsByTypename[id] ?? id;
}
