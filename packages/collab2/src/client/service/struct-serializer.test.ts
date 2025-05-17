 
 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeAll, expect, it } from 'vitest';

import { StructSerializer } from './struct-serializer';
import { emptyState } from './utils/empty-state';

let serializer: StructSerializer;

beforeAll(() => {
  serializer = new StructSerializer();
});

it('serializes empty state', () => {
  const state = emptyState;

  const serialized = serializer.serialize(state);

  const persisted = JSON.parse(JSON.stringify(serialized));
  const deserialized = serializer.deserialize(serialized);
  expect(deserialized).toEqual(state);

  const persistedDeserialized = serializer.deserialize(persisted);
  expect(persistedDeserialized).toEqual(state);
});

it('removes unknown properties', () => {
  const state = emptyState;

  const stateWithExtra = {
    ...emptyState,
    _extra: 'hello',
  };

  const serialized = serializer.serialize(stateWithExtra);

  // Persist using JSON
  const persisted = JSON.parse(JSON.stringify(serialized));
  const deserialized = serializer.deserialize(serialized);
  expect(deserialized).toEqual(state);

  const persistedDeserialized = serializer.deserialize(persisted);
  expect(persistedDeserialized).toEqual(state);
});

it('throws error on missing properties', () => {
  const state = emptyState;

  const serialized = serializer.serialize(state);
  const persisted = JSON.parse(JSON.stringify(serialized));

  const persistedWithProperty = {
    ...persisted,
    viewText: undefined,
  };

  expect(() => serializer.deserialize(persistedWithProperty)).toThrowError();
});
