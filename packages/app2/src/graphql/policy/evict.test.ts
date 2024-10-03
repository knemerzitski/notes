import { expect, it, describe, vi } from 'vitest';
import { InMemoryCache } from '@apollo/client';
import { CustomTypePolicies } from '../types';
import { EvictTag, TypePoliciesEvictor } from './evict';

describe('evictByTag', () => {
  it('evicts query fields regardless of args', () => {
    const typePolicies: CustomTypePolicies = {
      Query: {
        fields: {
          foo: {
            evict: {
              tag: EvictTag.CURRENT_USER,
            },
          },
        },
      },
    };
    const cache = new InMemoryCache({
      typePolicies,
    });

    cache.restore({
      ROOT_QUERY: {
        foo: { __ref: 'Foo:1' },
        'foo({"type":"g"})': { __ref: 'Foo:1' },
        'foo({"type":"r"})': { __ref: 'Foo:1' },
      },
    });

    const typePoliciesEvict = new TypePoliciesEvictor({
      cache,
      typePolicies,
    });
    typePoliciesEvict.evictByTag({
      tag: EvictTag.CURRENT_USER,
    });

    expect(cache.extract()).toStrictEqual({});
  });

  it('evicts by tag only for given arg with possibleKeyArgs', () => {
    const typePolicies: CustomTypePolicies = {
      Query: {
        fields: {
          foo: {
            evict: {
              tag: EvictTag.CURRENT_USER,
              possibleKeyArgs: {
                b: ['2', '3'],
              },
            },
          },
        },
      },
    };
    const cache = new InMemoryCache({
      typePolicies,
    });
    cache.restore({
      ROOT_QUERY: {
        foo: { __ref: 'Foo:1' },
        'foo({"a":"1","b":"2"})': { __ref: 'Foo:1' },
        'foo({"a":"2","b":"3"})': { __ref: 'Foo:1' },
      },
    });

    const typePoliciesEvict = new TypePoliciesEvictor({
      cache,
      typePolicies,
    });
    typePoliciesEvict.evictByTag({
      tag: EvictTag.CURRENT_USER,
      args: {
        a: '1',
      },
    });

    expect(cache.extract()).toEqual({
      ROOT_QUERY: {
        foo: { __ref: 'Foo:1' },
        'foo({"a":"2","b":"3"})': { __ref: 'Foo:1' },
      },
    });
  });

  it('invokes field evicted callback', () => {
    const evictedFn = vi.fn();
    const typePolicies: CustomTypePolicies = {
      Query: {
        fields: {
          foo: {
            evict: {
              tag: EvictTag.CURRENT_USER,
              evicted: evictedFn,
            },
          },
        },
      },
    };
    const cache = new InMemoryCache({
      typePolicies,
    });
    cache.restore({
      ROOT_QUERY: {
        foo: { __ref: 'Foo:1' },
      },
    });

    const typePoliciesEvict = new TypePoliciesEvictor({
      cache,
      typePolicies,
    });
    typePoliciesEvict.evictByTag({
      tag: EvictTag.CURRENT_USER,
    });

    expect(evictedFn).toHaveBeenCalledWith(
      { __ref: 'ROOT_QUERY' },
      expect.objectContaining({
        fieldName: 'foo',
      })
    );

    expect(cache.extract()).toStrictEqual({});
  });
});

describe('evict', () => {
  it('invokes type evicted', () => {
    const evictedFn = vi.fn();
    const typePolicies: CustomTypePolicies = {
      Foo: {
        evict: {
          evicted: evictedFn,
        },
      },
    };
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

    const typePoliciesEvict = new TypePoliciesEvictor({
      cache,
      typePolicies,
    });

    typePoliciesEvict.evict({
      id: 'Foo:1',
    });

    expect(evictedFn).toHaveBeenCalledWith({ __ref: 'Foo:1' }, expect.any(Object));

    expect(cache.extract()).toStrictEqual({});
  });

  it('invokes field evicted', () => {
    const evictedFn = vi.fn();
    const typePolicies: CustomTypePolicies = {
      Foo: {
        fields: {
          value: {
            evict: {
              evicted: evictedFn,
            },
          },
        },
      },
    };
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

    const typePoliciesEvict = new TypePoliciesEvictor({
      cache,
      typePolicies,
    });

    typePoliciesEvict.evict({
      id: 'Foo:1',
      fieldName: 'value',
    });

    expect(evictedFn).toHaveBeenCalledWith(
      { __ref: 'Foo:1' },
      expect.objectContaining({
        fieldName: 'value',
      })
    );

    expect(cache.extract()).toStrictEqual({
      'Foo:1': {
        __typename: 'Foo',
        id: '1',
      },
    });
  });
});
