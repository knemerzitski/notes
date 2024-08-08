import { GraphQLError } from 'graphql';
import { AggregateOptions, ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { groupBy } from '~utils/array/group-by';

import { CollectionName, MongoDBCollections } from '../collections';

import { MongoDBContext } from '../lambda-context';
import { mapQueryAggregateResult as queryFilterAggregateResult } from '../query/map-query-aggregate-result';
import { MergedDeepObjectQuery, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { DeepQuery, DeepQueryResult } from '../query/query';

import {
  QueryableNote,
  queryableNoteDescription,
} from '../schema/note/query/queryable-note';

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

export async function queryableNoteBatchLoad(
  keys: readonly QueryableNoteLoadKey[],
  context: Readonly<QueryableNoteBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResult<QueryableNote> | Error)[]> {
  const keysByUserId = groupBy(keys, (key) => key.userId.toString('hex'));

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
