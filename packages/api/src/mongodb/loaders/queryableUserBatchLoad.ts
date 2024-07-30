import { AggregateOptions, ObjectId } from 'mongodb';

import { MongoDBCollections } from '../collections';

import { MongoDBContext } from '../lambda-context';
import queryFilterAggregateResult from '../query/mapQueryAggregateResult';
import mergeQueries, { MergedDeepObjectQuery } from '../query/mergeQueries';
import mergedQueryToPipeline from '../query/mergedQueryToPipeline';
import { DeepQuery, DeepQueryResult } from '../query/query';
import {
  QueryableUser,
  queryableUserDescription,
} from '../schema/user/query/queryable-user';
import { QueryableUserNote } from '../schema/user-note/query/queryable-user-note';

import groupByUserId from './utils/groupByUserId';

export interface QueryableUserLoadKey {
  /**
   * UserNote.userId
   */
  userId: ObjectId;
  /**
   * Fields to retrieve, inclusion projection with inner paginations.
   */
  userQuery: DeepQuery<QueryableUser>;
}

export type QueryableUserBatchLoadContext = Pick<
  MongoDBContext<MongoDBCollections>,
  'collections'
>;

export default async function queryableUserBatchLoad(
  keys: readonly QueryableUserLoadKey[],
  context: Readonly<QueryableUserBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResult<QueryableUserNote> | Error)[]> {
  const keysByUserId = groupByUserId(keys);

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
      mergedQuery: MergedDeepObjectQuery<QueryableUserNote>;
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
