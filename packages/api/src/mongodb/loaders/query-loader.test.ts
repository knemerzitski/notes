/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryLoader, QueryLoaderEvents } from './query-loader';
import { mitt } from '~utils/mitt-unsub';
import isEqual from 'lodash.isequal';
import { coerce, number, object, string } from 'superstruct';
import { mock } from 'vitest-mock-extended';

describe('context', () => {
  it('passes global context to batchLoadFn', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);
    const globalContextMock = mock();

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
      context: globalContextMock,
    });

    await loader.load({
      id: null,
      query: null,
    });

    expect(batchLoadFn).toHaveBeenCalledWith(expect.anything(), {
      global: globalContextMock,
      request: undefined,
    });
  });

  it('passes request context to batchLoadFn', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    const requestContextMock = mock();

    await loader.load(
      {
        id: null,
        query: null,
      },
      {
        context: requestContextMock,
      }
    );

    expect(batchLoadFn).toHaveBeenCalledWith(expect.anything(), {
      global: undefined,
      request: requestContextMock,
    });
  });

  it('batches load calls with same request context', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    const requestContextMock = mock();

    await Promise.all([
      loader.load(
        {
          id: null,
          query: 1,
        },
        {
          context: requestContextMock,
        }
      ),
      loader.load(
        {
          id: null,
          query: 2,
        },
        {
          context: requestContextMock,
        }
      ),
    ]);

    expect(batchLoadFn).toHaveBeenCalledOnce();
  });

  it('splits load calls for each different request context', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    const requestContextMock = mock();
    const requestContextMock2 = mock();

    await Promise.all([
      loader.load(
        {
          id: null,
          query: 1,
        },
        {
          context: requestContextMock,
        }
      ),
      loader.load(
        {
          id: null,
          query: 2,
        },
        {
          context: requestContextMock2,
        }
      ),
    ]);

    expect(batchLoadFn).toHaveBeenCalledTimes(2);
  });
});

describe('load/prime', () => {
  it('fetches subsequent request from cache', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    await loader.load({
      id: null,
      query: 1,
    });
    await loader.load({
      id: null,
      query: 1,
    });

    expect(batchLoadFn).toHaveBeenCalledOnce();
  });

  it('batches requests loaded in same event loop', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    await Promise.all([
      loader.load({
        id: null,
        query: 1,
      }),
      loader.load({
        id: null,
        query: 2,
      }),
    ]);

    expect(batchLoadFn).toBeCalledWith(
      [
        {
          id: null,
          query: 1,
        },
        {
          id: null,
          query: 2,
        },
      ],
      expect.anything()
    );
  });

  it('load option skipCache', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    await loader.load({
      id: null,
      query: 1,
    });
    await loader.load(
      {
        id: null,
        query: 1,
      },
      {
        clearCache: true,
      }
    );

    expect(batchLoadFn).toHaveBeenCalledTimes(2);
  });

  it('calls batchLoadFn by splitting the query', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k.map((a: any) => a.query));

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    await loader.load({
      id: null,
      query: {
        a: 1,
        b: 1,
      },
    });

    expect(batchLoadFn).toHaveBeenCalledWith(
      [
        {
          id: null,
          query: {
            a: 1,
          },
        },
        {
          id: null,
          query: {
            b: 1,
          },
        },
      ],
      expect.anything()
    );
  });

  it('loading partial query loads from cache', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k.map((a: any) => a.query));

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    await loader.load({
      id: null,
      query: {
        a: 1,
        b: 1,
      },
    });
    await loader.load({
      id: null,
      query: {
        b: 1,
      },
    });
    expect(batchLoadFn).toHaveBeenCalledOnce();
  });

  it('priming partial query loads from cache', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k.map((a: any) => a.query));

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      struct: mock(),
    });

    loader.prime(
      {
        id: null,
        query: {
          a: 1,
          b: 1,
        },
      },
      {
        result: {
          a: 'a',
          b: 'b',
        },
        type: 'raw',
      }
    );

    await expect(
      loader.load({
        id: null,
        query: {
          b: 1,
        },
      })
    ).resolves.toStrictEqual({
      a: 'a',
      b: 'b',
    });
  });

  it('caches ObjectId as a string', async () => {
    const batchLoadFn = vi.fn().mockImplementation(() => [{ value: 'a' }]);

    const cache = new Map();
    const cacheGetSpy = vi.spyOn(cache, 'get');

    const loader = new QueryLoader<any, any>({
      batchLoadFn: batchLoadFn,
      loaderOptions: {
        cacheMap: cache,
      },
      struct: mock(),
    });
    const objId = new ObjectId();

    await loader.load({
      id: {
        objId,
      },
      query: {
        value: 1,
      },
    });

    expect(cacheGetSpy).toHaveBeenCalledWith(
      `{"id":{"objId":"${objId.toString()}"},"query":{"value":1}}`
    );
  });
});

describe('event loaded', () => {
  it('prevents cycling loaded event emitting', async () => {
    const batchLoadFn = vi.fn().mockImplementation((k) => k);

    const eventBus = mitt<QueryLoaderEvents<any, any>>();

    const loader = new QueryLoader<any, any>({
      batchLoadFn,
      eventBus,
      struct: mock(),
    });
    eventBus.on('loaded', () => {
      loader.prime(
        {
          id: null,
          query: 1,
        },
        {
          result: null,
          type: 'raw',
        },
        {
          clearCache: true,
        }
      );
    });

    await loader.load({
      id: null,
      query: 1,
    });
  });

  it('calls loaded event with merged value', async () => {
    const batchLoadFn = vi.fn().mockImplementation((keys) => {
      return keys.map((key: { query: any }) => {
        if (isEqual(key.query, { id: 1 })) {
          return {
            id: 'id',
          };
        } else if (isEqual(key.query, { description: 1 })) {
          return {
            description: 'desc',
          };
        }
        return null;
      });
    });

    const eventBus = mitt<QueryLoaderEvents<any, any>>();
    const emitSpy = vi.spyOn(eventBus, 'emit');

    const loader = new QueryLoader({
      batchLoadFn: batchLoadFn,
      eventBus,
      struct: mock(),
    });

    await loader.load({
      id: null,
      query: {
        id: 1,
        description: 1,
      },
    });

    const value = {
      result: {
        id: 'id',
        description: 'desc',
      },
      type: 'raw',
    };

    expect(emitSpy.mock.calls).toStrictEqual([
      [
        'loaded',
        {
          key: {
            id: null,
            query: {
              id: 1,
            },
          },
          value,
        },
      ],
      [
        'loaded',
        {
          key: {
            id: null,
            query: {
              description: 1,
            },
          },
          value,
        },
      ],
    ]);
  });
});

describe('validation', () => {
  const Foo = object({
    str_rawNr: coerce(
      string(),
      number(),
      (nr) => String(nr),
      (str) => Number.parseInt(str)
    ),
  });

  const batchLoadFn = vi.fn().mockImplementation((keys) =>
    keys.map(() => ({
      str_rawNr: 10,
    }))
  );

  let loader: QueryLoader<null, typeof Foo>;
  beforeEach(() => {
    loader = new QueryLoader({
      batchLoadFn: batchLoadFn,
      struct: Foo,
    });
    batchLoadFn.mockClear();
  });

  it('returns validated data', async () => {
    await expect(
      loader.load(
        {
          id: null,
          query: {
            str_rawNr: 1,
          },
        },
        {
          resultType: 'validated',
        }
      )
    ).resolves.toStrictEqual({
      str_rawNr: '10',
    });
  });

  it('loads raw result that has been primed with validated result', async () => {
    loader.prime(
      {
        id: null,
        query: {
          str_rawNr: 1,
        },
      },
      {
        result: {
          str_rawNr: '15',
        },
        type: 'validated',
      }
    );

    await expect(
      loader.load(
        {
          id: null,
          query: {
            str_rawNr: 1,
          },
        },
        {
          resultType: 'raw',
        }
      )
    ).resolves.toStrictEqual({
      str_rawNr: 15,
    });
  });
});
