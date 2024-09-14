import { ObjectId, Document } from "mongodb";
import { InferRaw } from "superstruct";
import { groupBy } from "~utils/array/group-by";
import { isDefined } from "~utils/type-guards/is-defined";
import { mapQueryAggregateResult } from "../../query/map-query-aggregate-result";
import { mergeQueries, MergedQueryDeep } from "../../query/merge-queries";
import { mergedQueryToPipeline } from "../../query/merged-query-to-pipeline";
import { QueryDeep, PartialQueryResultDeep } from "../../query/query";
import { getEqualObjectString } from "../../query/utils/get-equal-object-string";
import { QueryableUser, queryableUserDescription } from "./description";
import { QueryableUserId, QueryableUserLoaderKey, QueryableUserLoadContext, UserNotFoundQueryLoaderError } from "./loader";

interface BatchLoadIdProcessor<T> {
  getIds(): T[];
  addIdToQuery(query: QueryDeep<InferRaw<typeof QueryableUser>>): void;
  getMatchStage(): Document | undefined;
  addResult(result: Document): void;
  getResultById(id: QueryableUserId): Document | undefined;
}

class UserIdProcessor implements BatchLoadIdProcessor<ObjectId> {
  private readonly ids: Set<ObjectId>;
  private readonly resultById: Record<string, Document> = {};

  constructor(keys: readonly QueryableUserLoaderKey[]) {
    this.ids = new Set(
      keys
        .map((key) => ('userId' in key.id ? key.id.userId : undefined))
        .filter(isDefined)
    );
  }

  getIds(): ObjectId[] {
    return [...this.ids];
  }

  addIdToQuery(query: QueryDeep<InferRaw<typeof QueryableUser>>): void {
    if (this.ids.size === 0) return;
    query._id = 1;
  }

  getMatchStage(): Document | undefined {
    if (this.ids.size === 0) return;
    return {
      _id: {
        $in: this.getIds(),
      },
    };
  }

  addResult(result: Document): void {
    if (this.ids.size === 0) return;

    const userId = result._id;
    if (!(userId instanceof ObjectId)) {
      throw new Error('Expected User._id to be defined');
    }

    this.resultById[userId.toString()] = result;
  }

  getResultById(id: QueryableUserId): Document | undefined {
    if (!('userId' in id)) return;
    return this.resultById[id.userId.toString()];
  }
}

class GoogleUserIdProcessor implements BatchLoadIdProcessor<string> {
  private readonly ids: Set<string>;
  private readonly resultById: Record<string, Document> = {};

  constructor(keys: readonly QueryableUserLoaderKey[]) {
    this.ids = new Set(
      keys
        .map((key) => ('googleUserId' in key.id ? key.id.googleUserId : undefined))
        .filter(isDefined)
    );
  }

  getIds(): string[] {
    return [...this.ids];
  }

  addIdToQuery(query: QueryDeep<InferRaw<typeof QueryableUser>>): void {
    if (this.ids.size === 0) return;

    query.thirdParty = {
      ...query.thirdParty,
      google: {
        ...query.thirdParty?.google,
        id: 1,
      },
    };
  }

  getMatchStage(): Document | undefined {
    if (this.ids.size === 0) return;
    return {
      'thirdParty.google.id': {
        $in: this.getIds(),
      },
    };
  }

  addResult(result: Document): void {
    if (this.ids.size === 0) return;

    const googleUserId = result.thirdParty?.google?.id;
    if (typeof googleUserId !== 'string') {
      throw new Error('Expected User.thirdParty.google.id to be string');
    }

    this.resultById[googleUserId] = result;
  }

  getResultById(id: QueryableUserId): Document | undefined {
    if (!('googleUserId' in id)) return;
    return this.resultById[id.googleUserId];
  }
}

export async function batchLoad(
  keys: readonly QueryableUserLoaderKey[],
  context: QueryableUserLoadContext
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableUser>> | Error)[]> {
  const idProcessors: BatchLoadIdProcessor<unknown>[] = [
    new UserIdProcessor(keys),
    new GoogleUserIdProcessor(keys),
  ];

  const idQuery: QueryDeep<InferRaw<typeof QueryableUser>> = {};
  idProcessors.forEach((p) => {
    p.addIdToQuery(idQuery);
  });

  // Merge queries
  const mergedQuery = mergeQueries([...keys.map((key) => key.query), idQuery]);

  // Build aggregate pipeline
  const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
    description: queryableUserDescription,
    customContext: context.global,
  });

  // Fetch from database
  const usersResults = await context.global.collections.users
    .aggregate(
      [
        {
          $match: {
            $or: idProcessors.map((p) => p.getMatchStage()).filter(isDefined),
          },
        },
        ...aggregatePipeline,
      ],
      {
        session: context.request,
      }
    )
    .toArray();

  for (const userResult of usersResults) {
    idProcessors.forEach((p) => {
      p.addResult(userResult);
    });
  }

  return keys.map((key) => {
    for (const processor of idProcessors) {
      const result = processor.getResultById(key.id);
      if (result) {
        return mapQueryAggregateResult(key.query, mergedQuery, result, {
          descriptions: [queryableUserDescription],
        });
      }
    }

    return new UserNotFoundQueryLoaderError(key);
  });
}

// @ts-expect-error Keep function for backup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function queryableUserBatchLoadSeparatePerId(
  keys: readonly QueryableUserLoaderKey[],
  context: QueryableUserLoadContext
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableUser>> | Error | null)[]> {
  const queriesById = groupBy(keys, (key) => getEqualObjectString(key.id));

  const results = Object.fromEntries(
    await Promise.all(
      Object.entries(queriesById).map(async ([idStr, sameIdLoadKeys]) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstId = sameIdLoadKeys[0]!.id;

        // Merge queries
        const mergedQuery = mergeQueries(sameIdLoadKeys.map(({ query }) => query));

        // Build aggregate pipeline
        const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
          description: queryableUserDescription,
          customContext: context.global,
        });

        // Fetch from database
        const userResult = await context.global.collections.users
          .aggregate(
            [
              {
                $match: {
                  ...('userId' in firstId
                    ? { _id: firstId.userId }
                    : {
                        'thirdParty.google.id': firstId.googleUserId,
                      }),
                },
              },
              ...aggregatePipeline,
            ],
            {
              session: context.request,
            }
          )
          .toArray();

        return [
          idStr,
          {
            user: userResult[0],
            mergedQuery,
          },
        ];
      })
    )
  ) as Record<
    string,
    {
      user: Document | undefined;
      mergedQuery: MergedQueryDeep<InferRaw<typeof QueryableUser>>;
    }
  >;

  return keys.map((key) => {
    const result = results[getEqualObjectString(key.id)];
    if (!result?.user) return null;

    return mapQueryAggregateResult(key.query, result.mergedQuery, result.user, {
      descriptions: [queryableUserDescription],
    });
  });
}