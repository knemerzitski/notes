import { GraphQLError } from 'graphql';
import { AggregateOptions, ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import isObjectLike from '~utils/type-guards/isObjectLike';

import { MongoDBCollections } from '../collections';

import { MongoDBContext } from '../lambda-context';
import queryFilterAggregateResult from '../query/mapQueryAggregateResult';
import mergeQueries, { MergedDeepObjectQuery } from '../query/mergeQueries';
import mergedQueryToPipeline from '../query/mergedQueryToPipeline';
import { DeepQuery, DeepQueryResult } from '../query/query';
import {
  QueryableUserNote,
  queryableUserNoteDescription,
} from '../schema/user-note/query/queryable-user-note';

import groupByUserId from './utils/groupByUserId';

export interface QueryableUserNoteLoadKey {
  /**
   * UserNote.userId
   */
  userId: ObjectId;
  /**
   * Note.publicId
   */
  publicId: string;
  /**
   * Fields to retrieve, inclusion projection with inner paginations.
   */
  userNoteQuery: DeepQuery<QueryableUserNote>;
}

export type QueryableUserNoteBatchLoadContext = Pick<
  MongoDBContext<MongoDBCollections>,
  'collections'
>;

export default async function queryableUserNoteBatchLoad(
  keys: readonly QueryableUserNoteLoadKey[],
  context: Readonly<QueryableUserNoteBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResult<QueryableUserNote> | Error)[]> {
  const keysByUserId = groupByUserId(keys);

  const userNotesBy_userId_publicId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserLoadKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Gather publicIds
        const allPublicIds = sameUserLoadKeys.map(({ publicId }) => publicId);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserLoadKeys.map(({ userNoteQuery: noteQuery }) => noteQuery)
        );

        // publicId is required later after aggregate
        mergedQuery.note = {
          ...mergedQuery.note,
          publicId: 1,
        };

        // Build aggregate pipeline
        const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
          description: queryableUserNoteDescription,
          customContext: context,
        });

        // Fetch from database
        const userNotesResult = await context.collections.userNotes
          .aggregate(
            [
              {
                $match: {
                  userId,
                  'note.publicId': {
                    $in: allPublicIds,
                  },
                },
              },
              ...aggregatePipeline,
            ],
            aggregateOptions
          )
          .toArray();

        // Map userNote by publicId
        const userNoteBy_publicId = userNotesResult.reduce<Record<string, Document>>(
          (userNoteMap, userNote) => {
            const note: unknown = userNote.note;
            if (!isObjectLike(note)) {
              throw new Error('Expected UserNote.note to be a defined object');
            }
            const publicId: unknown = note.publicId;
            if (typeof publicId !== 'string') {
              throw new Error('Expected UserNote.note.publicId to be defined string');
            }

            userNoteMap[publicId] = userNote;

            return userNoteMap;
          },
          {}
        );

        return [
          userIdStr,
          {
            userNoteBy_publicId,
            mergedQuery,
          },
        ];
      })
    )
  ) as Record<
    string,
    {
      userNoteBy_publicId: Record<string, Document>;
      mergedQuery: MergedDeepObjectQuery<QueryableUserNote>;
    }
  >;

  return keys.map((key) => {
    const userResult = userNotesBy_userId_publicId[key.userId.toString()];
    const userNote = userResult?.userNoteBy_publicId[key.publicId];
    if (!userNote) {
      return new GraphQLError(`Note '${key.publicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
        },
      });
    }

    return queryFilterAggregateResult(
      key.userNoteQuery,
      userResult.mergedQuery,
      userNote,
      {
        descriptions: [queryableUserNoteDescription],
      }
    );
  });
}
