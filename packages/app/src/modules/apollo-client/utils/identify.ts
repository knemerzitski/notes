export interface StorageObject {
  cacheId: string;
  __typename: string;
  id: string;
}

export type CompactStorageObject = Pick<StorageObject, '__typename' | 'id'>;

export function identify(object: CompactStorageObject) {
  return `${object.__typename}:${object.id}`;
}

export function inverseIdentify(cacheId: string | CompactStorageObject): StorageObject {
  if (typeof cacheId === 'string') {
    const colonIndex = cacheId.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Failed to inverseIdentify ${cacheId}`);
    }
    const __typename = cacheId.substring(0, colonIndex);
    if (!__typename) {
      throw new Error(`Failed to parse __typename from ${cacheId}`);
    }
    const id = cacheId.substring(colonIndex + 1);
    if (!id) {
      throw new Error(`Failed to parse id from ${cacheId}`);
    }

    return {
      cacheId,
      __typename,
      id,
    };
  } else {
    return {
      ...cacheId,
      cacheId: identify(cacheId),
    };
  }
}
