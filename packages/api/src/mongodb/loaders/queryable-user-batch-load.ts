import { AggregateOptions, ObjectId } from 'mongodb';

import { groupBy } from '~utils/array/group-by';

import { CollectionName, MongoDBCollections } from '../collections';

import { MongoDBContext } from '../lambda-context';
import { mapQueryAggregateResult as queryFilterAggregateResult } from '../query/map-query-aggregate-result';
import { MergedDeepObjectQuery, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { DeepQuery, DeepQueryResult } from '../query/query';
import {
  QueryableUser,
  queryableUserDescription,
} from '../schema/user/query/queryable-user';

export interface QueryableUserLoadKey {
  /**
   * User._id
   */
  userId: ObjectId;
  /**
   * Fields to retrieve, inclusion projection with inner paginations.
   */
  userQuery: DeepQuery<QueryableUser>;
}

export interface QueryableUserBatchLoadContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.USERS | CollectionName.NOTES
  >;
}

export async function queryableUserBatchLoad(
  keys: readonly QueryableUserLoadKey[],
  context: Readonly<QueryableUserBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResult<QueryableUser> | Error)[]> {
  const keysByUserId = groupBy(keys, (item) => item.userId.toHexString());

  const results = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserLoadKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserLoadKeys.map(({ userQuery }) => userQuery)
        );

        // Build aggregate pipeline
        const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
          description: queryableUserDescription,
          customContext: context,
        });

        // Fetch from database
        const userResult = await context.collections.users
          .aggregate(
            [
              {
                $match: {
                  _id: userId,
                },
              },
              ...aggregatePipeline,
            ],
            aggregateOptions
          )
          .toArray();

        return [
          userIdStr,
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
      mergedQuery: MergedDeepObjectQuery<QueryableUser>;
    }
  >;

  return keys.map((key) => {
    const result = results[key.userId.toString()];
    if (!result?.user) {
      return new Error(`User '${key.userId.toString()}' not found`);
    }

    return queryFilterAggregateResult(key.userQuery, result.mergedQuery, result.user, {
      descriptions: [queryableUserDescription],
    });
  });
}
