/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ObjectId } from 'mongodb';
import { expect, it, vi } from 'vitest';

import { QueryLoaderParams, QueryLoader, QueryLoaderEvents } from './query-loader';
import { mitt } from '~utils/mitt-unsub';
import isEqual from 'lodash.isequal';

interface Product {
  name: string;
  price: number;
}

interface Shop {
  id: string;
  description: string;
  topProducts: Product[];
}

interface Context {
  session: string;
}

interface ShopId {
  shopId: string;
}

interface GlobalContext {
  database: () => Promise<Database>;
}

interface Database {
  shops: Shop[];
}

async function database(): Promise<Database> {
  return Promise.resolve({
    shops: [
      {
        id: 'first',
        description: 'the best shop',
        topProducts: [
          {
            name: 'pc',
            price: 1000,
          },
          {
            name: 'tree',
            price: 5000,
          },
        ],
      },
    ],
  });
}

const batchLoadFn: QueryLoaderParams<
  ShopId,
  Shop,
  GlobalContext,
  Context
>['batchLoadFn'] = async (keys, ctx) => {
  const db = await ctx.global.database();

  return keys.map((key) => {
    const shop = db.shops.find((shop) => shop.id === key.id.shopId);
    if (!shop) {
      return Error(`Shop '${key.id.shopId}' not found`);
    }
    return shop;
  });
};

it('query is split: any future partial query is cached', async () => {
  const spyBatchLoadFn = vi.fn().mockImplementation(batchLoadFn);

  const loader = new QueryLoader<ShopId, Shop, GlobalContext, Context>({
    batchLoadFn: spyBatchLoadFn,
    context: {
      database,
    },
  });

  let result = await loader.load({
    id: {
      shopId: 'first',
    },
    query: {
      id: 1,
      description: 1,
      topProducts: {
        name: 1,
        price: 1,
      },
    },
  });
  expect(result).toStrictEqual({
    id: 'first',
    description: 'the best shop',
    topProducts: [
      { name: 'pc', price: 1000 },
      { name: 'tree', price: 5000 },
    ],
  });
  expect(spyBatchLoadFn).toHaveBeenCalledTimes(1);
  expect(
    spyBatchLoadFn.mock.calls[0][0],
    'Expected load to be called 4 times.'
  ).toHaveLength(4);

  result = await loader.load({
    id: {
      shopId: 'first',
    },
    query: {
      id: 1,
      description: 1,
    },
  });
  expect(result?.description).toStrictEqual('the best shop');
  expect(spyBatchLoadFn).toHaveBeenCalledTimes(1);

  result = await loader.load({
    id: {
      shopId: 'first',
    },
    query: {
      id: 1,
      topProducts: {
        name: 1,
      },
    },
  });
  expect(result?.topProducts?.map((p) => p.name)).toStrictEqual(['pc', 'tree']);
  expect(spyBatchLoadFn).toHaveBeenCalledTimes(1);
});

it('passes request context to load function', async () => {
  const spyBatchLoadFn = vi.fn().mockResolvedValueOnce([{}]);

  const loader = new QueryLoader<ShopId, Shop, GlobalContext, Context>({
    batchLoadFn: spyBatchLoadFn,
    context: {
      database,
    },
  });

  await loader.load(
    {
      id: {
        shopId: 'first',
      },
      query: {
        id: 1,
      },
    },
    {
      context: {
        session: 'the session',
      },
    }
  );
  expect(spyBatchLoadFn.mock.calls[0][1].request).toStrictEqual({
    session: 'the session',
  });
});

it('primes value to cache', async () => {
  const spyBatchLoadFn = vi.fn();

  const loader = new QueryLoader<ShopId, Shop, GlobalContext, Context>({
    batchLoadFn: spyBatchLoadFn,
    context: {
      database,
    },
  });

  loader.prime(
    {
      id: {
        shopId: 'first',
      },
      query: {
        id: 1,
        description: 1,
      },
    },
    {
      id: 'first',
      description: 'well',
    }
  );

  const result = await loader.load({
    id: {
      shopId: 'first',
    },
    query: {
      description: 1,
    },
  });
  expect(spyBatchLoadFn, 'Value was not primed').toHaveBeenCalledTimes(0);

  expect(result).toStrictEqual({
    id: 'first',
    description: 'well',
  });
});

it('priming without value leaves it empty, load is not called', async () => {
  const spyBatchLoadFn = vi.fn();

  const loader = new QueryLoader<ShopId, Shop, GlobalContext, Context>({
    batchLoadFn: spyBatchLoadFn,
    context: {
      database,
    },
  });

  loader.prime(
    {
      id: {
        shopId: 'first',
      },
      query: {
        id: 1,
        description: 1,
      },
    },
    {
      id: 'first',
      description: 'well',
    }
  );

  // Clears description
  loader.prime(
    {
      id: {
        shopId: 'first',
      },
      query: {
        id: 1,
        description: 1,
      },
    },
    {
      id: 'new id',
    },
    {
      clearCache: true,
    }
  );

  const result = await loader.load({
    id: {
      shopId: 'first',
    },
    query: {
      id: 1,
    },
  });
  expect(spyBatchLoadFn, 'Batch load should have not been called').toHaveBeenCalledTimes(
    0
  );

  expect(result).toStrictEqual({
    id: 'new id',
  });
});

it('caches ObjectId as string', async () => {
  const spyBatchLoadFn = vi.fn().mockImplementation((keys) => keys);

  const cache = new Map();
  const spyCacheGet = vi.spyOn(cache, 'get');

  const loader = new QueryLoader<{ id: ObjectId }, { value: string }, never, never>({
    batchLoadFn: spyBatchLoadFn,
    loaderOptions: {
      cacheMap: cache,
    },
  });
  const objId = new ObjectId();

  await loader.load({
    id: {
      id: objId,
    },
    query: {
      value: 1,
    },
  });

  expect(spyCacheGet.mock.calls).toStrictEqual([
    [`{"id":{"id":"${objId.toString()}"},"query":{"value":1}}`],
  ]);
});

it('calls event loaded with merged value', async () => {
  const spyBatchLoadFn = vi.fn().mockImplementation((keys) => {
    return keys.map((key: { query: any }) => {
      if (isEqual(key.query, { id: 1 })) {
        return {
          id: 12,
        };
      } else if (isEqual(key.query, { description: 1 })) {
        return {
          description: 'the desc',
        };
      }
      throw new Error('oops wrong query: ' + JSON.stringify(key));
    });
  });

  const eventBus = mitt<QueryLoaderEvents<any, any>>();
  const spyEmit = vi.spyOn(eventBus, 'emit');

  const loader = new QueryLoader({
    batchLoadFn: spyBatchLoadFn,
    eventBus,
  });

  await loader.load({
    id: {
      shopId: 'first',
    },
    query: {
      id: 1,
      description: 1,
    },
  });

  expect(spyEmit.mock.calls).toStrictEqual([
    [
      'loaded',
      {
        key: {
          id: {
            shopId: 'first',
          },
          query: {
            id: 1,
          },
        },
        value: {
          id: 12,
          description: 'the desc',
        },
      },
    ],
    [
      'loaded',
      {
        key: {
          id: {
            shopId: 'first',
          },
          query: {
            description: 1,
          },
        },
        value: {
          id: 12,
          description: 'the desc',
        },
      },
    ],
  ]);
});
