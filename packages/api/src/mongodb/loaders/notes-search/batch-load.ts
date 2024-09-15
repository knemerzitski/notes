import { InferRaw } from 'superstruct';
import { groupBy } from '~utils/array/group-by';
import { STRUCT_STRING } from '../../constants';
import { mapQueryAggregateResult } from '../../query/map-query-aggregate-result';
import { mergeQueries, MergedQueryDeep } from '../../query/merge-queries';
import { mergedQueryToPipeline } from '../../query/merged-query-to-pipeline';
import { PartialQueryResultDeep } from '../../query/query';
import { NoteSearchIndexName } from '../../schema/note';
import { notesSearchDescription, QueryableSearchNotes } from './description';
import {
  QueryableNotesSearchLoaderKey,
  QueryableNotesSearchLoadContext,
  QueryableNotesSearchId,
} from './loader';
import {
  CursorAfterPagination,
  CursorAfterBoundPagination,
  CursorBeforePagination,
  CursorBeforeBoundPagination,
  CursorFirstPagination,
  CursorLastPagination,
  getPaginationKey,
} from '../../pagination/cursor-struct';

export async function batchLoad(
  keys: readonly QueryableNotesSearchLoaderKey[],
  context: QueryableNotesSearchLoadContext
): Promise<(PartialQueryResultDeep<InferRaw<typeof QueryableSearchNotes>> | Error)[]> {
  const userIdToKeys = groupBy(keys, (item) => item.id.userId.toHexString());

  const userIdToArgsToAggregateResults = Object.fromEntries(
    await Promise.all(
      Object.entries(userIdToKeys).map(async ([userIdStr, sameUserKeys]) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstUserKey = sameUserKeys[0]!;
        const userId = firstUserKey.id.userId;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return [
          userIdStr,
          Object.fromEntries(
            await Promise.all(
              Object.entries(
                groupBy(sameUserKeys, (item) => notesSearchIdToStr(item.id))
              ).map(async ([sameArgsStr, sameArgsKeys]) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const firstSameArgsKey = sameArgsKeys[0]!;

                const searchText = firstSameArgsKey.id.searchText;
                const pagination = firstSameArgsKey.id.pagination;

                // Merge queries
                const mergedQuery = mergeQueries(sameArgsKeys.map(({ query }) => query));

                mergedQuery.cursor = 1;

                // Build aggregate pipeline for note
                const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
                  description: notesSearchDescription,
                  customContext: context.global,
                });

                // Translate pagination appropriate for $search stage
                let limit: number | undefined;
                let sortReverse = false;
                let searchAfter: string | undefined;
                let searchBefore: string | undefined;
                if (pagination) {
                  if (CursorAfterPagination(STRUCT_STRING).is(pagination)) {
                    searchAfter = pagination.after;
                    if (CursorAfterBoundPagination(STRUCT_STRING).is(pagination)) {
                      limit = pagination.first;
                    }
                  } else if (CursorBeforePagination(STRUCT_STRING).is(pagination)) {
                    searchBefore = pagination.before;
                    if (CursorBeforeBoundPagination(STRUCT_STRING).is(pagination)) {
                      limit = pagination.last;
                    }
                  } else if (CursorFirstPagination.is(pagination)) {
                    limit = pagination.first;
                  } else if (CursorLastPagination.is(pagination)) {
                    limit = pagination.last;
                    sortReverse = true;
                  }
                }

                // Fetch from database
                const notesResult = await context.global.collections.notes
                  .aggregate(
                    [
                      // Find all possible notes with searchText
                      {
                        $search: {
                          index: NoteSearchIndexName.COLLAB_TEXTS_HEAD_TEXT,
                          ...(searchAfter && {
                            searchAfter,
                          }),
                          ...(searchBefore && {
                            searchBefore,
                          }),
                          compound: {
                            filter: [
                              {
                                equals: {
                                  path: 'users._id',
                                  value: userId,
                                },
                              },
                            ],
                            must: [
                              {
                                text: {
                                  path: 'collabText.headText.changeset',
                                  query: searchText,
                                },
                              },
                            ],
                          },
                        },
                      },
                      {
                        $addFields: {
                          _search: {
                            score: { $meta: 'searchScore' },
                          },
                        },
                      },
                      //Sort order
                      {
                        $sort: {
                          '_search.score': sortReverse ? 1 : -1,
                        },
                      },
                      ...(limit != null
                        ? [
                            {
                              $limit: limit,
                            },
                          ]
                        : []),
                      {
                        $project: {
                          _id: 0,
                          cursor: { $meta: 'searchSequenceToken' },
                          note: '$$ROOT',
                        },
                      },
                      ...aggregatePipeline,
                    ],
                    {
                      session: context.request,
                    }
                  )
                  .toArray();

                if (sortReverse) {
                  notesResult.reverse();
                }

                return [sameArgsStr, { notesResult, mergedQuery }];
              })
            )
          ),
        ];
      })
    )
  ) as Record<
    string,
    Record<
      string,
      {
        notesResult: Document[];
        mergedQuery: MergedQueryDeep<InferRaw<typeof QueryableSearchNotes>>;
      }
    >
  >;

  return keys.map((key) => {
    const userResults = userIdToArgsToAggregateResults[key.id.userId.toHexString()];
    if (!userResults) {
      return [];
    }
    const argsResults = userResults[notesSearchIdToStr(key.id)];
    if (!argsResults) {
      return [];
    }

    return argsResults.notesResult.map((noteResult) => {
      return mapQueryAggregateResult(key.query, argsResults.mergedQuery, noteResult, {
        descriptions: [notesSearchDescription],
      });
    });
  });
}

function notesSearchIdToStr(key: QueryableNotesSearchId) {
  return (
    key.searchText +
    (key.pagination ? ':' + getPaginationKey(key.pagination, STRUCT_STRING) : '')
  );
}
