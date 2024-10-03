/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { TypePoliciesPersistentStorage } from './persist';
import { InMemoryCache } from '@apollo/client';
import { PersistentStorage } from 'apollo3-cache-persist';
import { CustomTypePolicies } from '../types';

describe('writeAllAssign', () => {
  it('is called', () => {
    const typePolicies: CustomTypePolicies = {
      Foo: {
        persist: {
          writeAllAssign() {
            return [
              {
                __typename: 'Foo',
                id: '1',
                assigned: 'assigned',
              },
            ];
          },
        },
      },
    };
    const storage = mock<PersistentStorage<any>>();
    const cache = new InMemoryCache({
      typePolicies,
    });
    cache.restore({
      'Foo:1': {
        __typename: 'Foo',
        id: '1',
        value: 'foo',
      },
    });
    const typePoliciesStorage = new TypePoliciesPersistentStorage({
      cache,
      serialize(value) {
        return JSON.stringify(value);
      },
      storage,
      typePolicies,
    });

    typePoliciesStorage.setItem('persist', JSON.stringify(cache.extract()));

    expect(storage.setItem).toHaveBeenCalledWith(
      'persist',
      '{"Foo:1":{"__typename":"Foo","id":"1","value":"foo","assigned":"assigned"}}'
    );
  });
});

describe('readModify', () => {
  it('is called', async () => {
    const typePolicies: CustomTypePolicies = {
      Foo: {
        persist: {
          readModify(value: any) {
            value.read = 'read';
          },
        },
      },
    };
    const storage = mock<PersistentStorage<any>>();
    const cache = new InMemoryCache({
      typePolicies,
    });
    cache.restore({
      'Foo:1': {
        __typename: 'Foo',
        id: '1',
        value: 'foo',
      },
    });
    const typePoliciesStorage = new TypePoliciesPersistentStorage({
      cache,
      serialize(value) {
        return JSON.stringify(value);
      },
      storage,
      typePolicies,
    });

    storage.getItem.mockReturnValueOnce(JSON.stringify(cache.extract()));

    const itemResult = await typePoliciesStorage.getItem('persist');

    expect(itemResult).toStrictEqual(
      '{"Foo:1":{"__typename":"Foo","id":"1","value":"foo","read":"read"}}'
    );
  });
});
