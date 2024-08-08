/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ObjectId } from 'mongodb';
import { expect, it, vi } from 'vitest';

import { QueryLoaderParams, QueryLoader } from './query-loader';

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
        $query: {
          name: 1,
          price: 1,
        },
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
        $query: {
          name: 1,
        },
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
