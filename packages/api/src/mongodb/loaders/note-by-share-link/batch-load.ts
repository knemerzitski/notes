import { ObjectId } from 'mongodb';
import { InferRaw } from 'superstruct';

import { groupBy } from '../../../../../utils/src/array/group-by';

import { mapQueryAggregateResult } from '../../query/map-query-aggregate-result';
import { MergedQueryDeep, mergeQueries } from '../../query/merge-queries';
import { mergedQueryToPipeline } from '../../query/merged-query-to-pipeline';
import { PartialQueryResultDeep } from '../../query/query';

import { QueryableNote, queryableNoteDescription } from '../note/descriptions/note';

import {
  NoteByShareLinkNotFoundQueryLoaderError,
  QueryableNoteByShareLinkLoadContext,
  QueryableNoteByShareLinkLoaderKey,
} from './loader';

export async function batchLoad(
  keys: readonly QueryableNoteByShareLinkLoaderKey[],
  context: Readonly<QueryableNoteByShareLinkLoadContext>
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableNote>> | Error)[]> {
  const keysByShareLinkId = groupBy(keys, (item) => item.id.shareLinkId.toString('hex'));

  const noteResultBy_shareNoteLinkId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByShareLinkId).map(
        async ([shareNoteLinkIdStr, sameLinkLoadKeys]) => {
          const shareNoteLinkId =
            shareNoteLinkIdStr.length > 0
              ? ObjectId.createFromHexString(shareNoteLinkIdStr)
              : null;

          // Merge queries
          const mergedQuery = mergeQueries(sameLinkLoadKeys.map(({ query }) => query));

          // Id is required later after aggregate
          mergedQuery.shareLinks = {
            ...mergedQuery.shareLinks,
            _id: 1,
          };

          // Build aggregate pipeline
          const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
            description: queryableNoteDescription,
            customContext: context.global,
          });

          // Fetch from database
          const notesResult = await context.global.collections.notes
            .aggregate(
              [
                {
                  $match: {
                    'shareLinks._id': shareNoteLinkId,
                  },
                },
                ...aggregatePipeline,
              ],
              {
                session: context.request,
              }
            )
            .toArray();

          const noteResult = notesResult[0];

          return [
            shareNoteLinkIdStr,
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
      mergedQuery: MergedQueryDeep<InferRaw<typeof QueryableNote>>;
    }
  >;

  return keys.map((key) => {
    const noteResult = noteResultBy_shareNoteLinkId[key.id.shareLinkId.toString('hex')];
    if (!noteResult?.note) {
      return new NoteByShareLinkNotFoundQueryLoaderError(key);
    }

    // @ts-expect-error QueryObjectDeep issue
    return mapQueryAggregateResult(key.query, noteResult.mergedQuery, noteResult.note, {
      descriptions: [queryableNoteDescription],
    });
  });
}
