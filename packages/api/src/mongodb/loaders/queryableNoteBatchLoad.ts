import { GraphQLError } from 'graphql';
import { AggregateOptions, ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { CollectionName, MongoDBCollections } from '../collections';

import { MongoDBContext } from '../lambda-context';
import queryFilterAggregateResult from '../query/mapQueryAggregateResult';
import mergeQueries, { MergedDeepObjectQuery } from '../query/mergeQueries';
import mergedQueryToPipeline from '../query/mergedQueryToPipeline';
import { DeepQuery, DeepQueryResult } from '../query/query';

import {
  QueryableNote,
  queryableNoteDescription,
} from '../schema/note/query/queryable-note';

import groupByUserId from './utils/groupByUserId';

export interface QueryableNoteLoadKey {
  /**
   * Note.userNotes.userId
   */
  userId: ObjectId;
  /**
   * Note.publicId
   */
  publicId: string;
  /**
   * Fields to retrieve, inclusion projection with inner paginations.
   */
  noteQuery: DeepQuery<QueryableNote>;
}

export interface QueryableNoteBatchLoadContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

export default async function queryableNoteBatchLoad(
  keys: readonly QueryableNoteLoadKey[],
  context: Readonly<QueryableNoteBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResult<QueryableNote> | Error)[]> {
  const keysByUserId = groupByUserId(keys);

  const notesBy_userId_publicId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserLoadKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Gather publicIds
        const allPublicIds = sameUserLoadKeys.map(({ publicId }) => publicId);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserLoadKeys.map(({ noteQuery: noteQuery }) => noteQuery)
        );

        // publicId is required later after aggregate
        mergedQuery.publicId = 1;

        // Build aggregate pipeline
        const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
          description: queryableNoteDescription,
          customContext: context,
        });

        // Fetch from database
        const notesResult = await context.collections.notes
          .aggregate(
            [
              {
                $match: {
                  'userNotes.userId': userId,
                  publicId: {
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
        const noteBy_publicId = notesResult.reduce<Record<string, Document>>(
          (noteMap, note) => {
            const publicId: unknown = note.publicId;
            if (typeof publicId !== 'string') {
              throw new Error('Expected Note.publicId to be defined string');
            }

            noteMap[publicId] = note;

            return noteMap;
          },
          {}
        );

        return [
          userIdStr,
          {
            noteBy_publicId,
            mergedQuery,
          },
        ];
      })
    )
  ) as Record<
    string,
    {
      noteBy_publicId: Record<string, Document>;
      mergedQuery: MergedDeepObjectQuery<QueryableNote>;
    }
  >;

  return keys.map((key) => {
    const userResult = notesBy_userId_publicId[key.userId.toString()];
    const note = userResult?.noteBy_publicId[key.publicId];
    if (!note) {
      return new GraphQLError(`Note '${key.publicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
        },
      });
    }

    return queryFilterAggregateResult(key.noteQuery, userResult.mergedQuery, note, {
      descriptions: [queryableNoteDescription],
    });
  });
}
