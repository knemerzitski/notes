import { GraphQLError } from 'graphql';
import { AggregateOptions } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import groupBy from '~utils/array/groupBy';

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

export interface QueryableNoteByShareLinkLoadKey {
  /**
   * Note.shareNoteLinks.publicId
   */
  shareNoteLinkPublicId: string;
  /**
   * Fields to retrieve, inclusion projection with inner paginations.
   */
  noteQuery: DeepQuery<QueryableNote>;
}

export interface QueryableNoteByShareLinkBatchLoadContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

export default async function queryableNoteByShareLinkBatchLoad(
  keys: readonly QueryableNoteByShareLinkLoadKey[],
  context: Readonly<QueryableNoteByShareLinkBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResult<QueryableNote> | Error)[]> {
  const keysByShareNoteLinkPublicId = groupBy(keys, (item) => item.shareNoteLinkPublicId);

  const noteResultBy_shareNoteLinkPublicId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByShareNoteLinkPublicId).map(
        async ([shareNoteLinkPublicId, sameLinkLoadKeys]) => {
          // Merge queries
          const mergedQuery = mergeQueries(
            {},
            sameLinkLoadKeys.map(({ noteQuery: noteQuery }) => noteQuery)
          );

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
                    'shareNoteLinks.publicId': shareNoteLinkPublicId,
                  },
                },
                ...aggregatePipeline,
              ],
              aggregateOptions
            )
            .toArray();

          const noteResult = notesResult[0];

          return [
            shareNoteLinkPublicId,
            {
              note: noteResult,
              mergedQuery,
            },
          ];
        }
      )
    )
  ) as Record<
    string,
    {
      note: Document | undefined;
      mergedQuery: MergedDeepObjectQuery<QueryableNote>;
    }
  >;

  return keys.map((key) => {
    const noteResult = noteResultBy_shareNoteLinkPublicId[key.shareNoteLinkPublicId];
    if (!noteResult?.note) {
      return new GraphQLError(`Shared note '${key.shareNoteLinkPublicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
        },
      });
    }

    return queryFilterAggregateResult(
      key.noteQuery,
      noteResult.mergedQuery,
      noteResult.note,
      {
        descriptions: [queryableNoteDescription],
      }
    );
  });
}
