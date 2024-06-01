import { Reference, isReference, makeReference } from '@apollo/client';

export interface IdentifiedStoreObject {
  ref: Reference;
  __typename: string;
  id: string;
}

export type CompactStorageObject = Pick<IdentifiedStoreObject, '__typename' | 'id'>;

export function identify(object: CompactStorageObject) {
  if ('ref' in object && isReference(object.ref)) {
    return object.ref;
  }
  return makeReference(`${object.__typename}:${object.id}`);
}

export function inverseIdentify(
  object: string | CompactStorageObject
): IdentifiedStoreObject {
  if (typeof object === 'string') {
    const colonIndex = object.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Failed to inverseIdentify ${object}`);
    }
    const __typename = object.substring(0, colonIndex);
    if (!__typename) {
      throw new Error(`Failed to parse __typename from ${object}`);
    }
    const id = object.substring(colonIndex + 1);
    if (!id) {
      throw new Error(`Failed to parse id from ${object}`);
    }

    return {
      ref: makeReference(object),
      __typename,
      id,
    };
  } else {
    return {
      ...object,
      ref: identify(object),
    };
  }
}
