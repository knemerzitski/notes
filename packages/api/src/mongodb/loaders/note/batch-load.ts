import { ObjectId } from 'mongodb';
import { InferRaw } from 'superstruct';
import { groupBy } from '~utils/array/group-by';

import { mapQueryAggregateResult } from '../../query/map-query-aggregate-result';
import { mergeQueries, MergedQueryDeep } from '../../query/merge-queries';
import { mergedQueryToPipeline } from '../../query/merged-query-to-pipeline';
import { PartialQueryResultDeep } from '../../query/query';

import { QueryableNote, queryableNoteDescription } from './descriptions/note';
import {
  QueryableNoteLoaderKey,
  QueryableNoteLoadContext,
  NoteNotFoundQueryLoaderError,
} from './loader';

export async function batchLoad(
  keys: readonly QueryableNoteLoaderKey[],
  context: QueryableNoteLoadContext
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableNote>> | Error)[]> {
  const keysByUserId = groupBy(
    keys,
    ({ id: { userId } }) => userId?.toString('hex') ?? ''
  );

  const notesBy_userId_noteId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserLoadKeys]) => {
        const userId =
          userIdStr.length > 0 ? ObjectId.createFromHexString(userIdStr) : null;

        // Gather noteIds
        const allNoteIds = sameUserLoadKeys.map(({ id: { noteId } }) => noteId);

        // Merge queries
        const mergedQuery = mergeQueries(sameUserLoadKeys.map(({ query }) => query));

        // _id is required later after aggregate
        mergedQuery._id = 1;

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
                  ...(userId && { 'users._id': userId }),
                  _id: {
                    $in: allNoteIds,
                  },
                },
              },
              ...aggregatePipeline,
            ],
            {
              session: context.request,
            }
          )
          .toArray();

        const noteById = notesResult.reduce<Record<string, Document>>((noteMap, note) => {
          if (note._id instanceof ObjectId) {
            noteMap[note._id.toString('hex')] = note;
          }

          return noteMap;
        }, {});

        return [
          userIdStr,
          {
            noteById,
            mergedQuery,
          },
        ];
      })
    )
  ) as Record<
    string,
    {
      noteById: Record<string, Document>;
      mergedQuery: MergedQueryDeep<InferRaw<typeof QueryableNote>>;
    }
  >;

  return keys.map((key) => {
    const userResult = notesBy_userId_noteId[key.id.userId?.toString('hex') ?? ''];
    const note = userResult?.noteById[key.id.noteId.toString('hex')];
    if (!note) {
      return new NoteNotFoundQueryLoaderError(key);
    }

    // @ts-expect-error QueryObjectDeep issue
    return mapQueryAggregateResult(key.query, userResult.mergedQuery, note, {
      descriptions: [queryableNoteDescription],
    });
  });
}
