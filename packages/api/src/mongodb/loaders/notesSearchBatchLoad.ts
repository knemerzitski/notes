import { AggregateOptions, ObjectId } from 'mongodb';

import groupBy from '~utils/array/groupBy';

import { CollectionName, MongoDBCollections } from '../collections';

import { MongoDBContext } from '../lambda-context';
import {
  getPaginationKey,
  isAfterBoundPagination,
  isAfterPagination,
  isBeforeBoundPagination,
  isBeforePagination,
  isFirstPagination,
  isLastPagination,
  RelayPagination,
} from '../pagination/relayArrayPagination';
import { DeepAnyDescription } from '../query/description';
import queryFilterAggregateResult from '../query/mapQueryAggregateResult';
import mergeQueries, { MergedDeepObjectQuery } from '../query/mergeQueries';
import mergedQueryToPipeline from '../query/mergedQueryToPipeline';
import { DeepQuery, DeepQueryResult } from '../query/query';

import fieldsRemoved from '../query/utils/fieldsRemoved';
import {
  QueryableNote,
  queryableNoteDescription,
} from '../schema/note/query/queryable-note';

export interface QueryableNoteSearch {
  note: QueryableNote;
  cursor: string;
}

const searchDescription: DeepAnyDescription<QueryableNoteSearch> = {
  note: fieldsRemoved(queryableNoteDescription, ['$mapLastProject']),
};

export interface QueryableNotesSearchLoadKey {
  /**
   * Note.userId
   */
  userId: ObjectId;
  /**
   * Text to find in either note title or content
   */
  searchText: string;
  /**
   * Paginate search results
   */
  pagination?: RelayPagination<string>;
  /**
   * Fields to retrieve, inclusion projection with inner paginations.
   */
  searchQuery: DeepQuery<QueryableNoteSearch>;
}

export interface NotesSearchBatchLoadContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES
  >;
}

export default async function notesSearchBatchLoad(
  keys: readonly QueryableNotesSearchLoadKey[],
  context: Readonly<NotesSearchBatchLoadContext>,
  aggregateOptions?: AggregateOptions
): Promise<(DeepQueryResult<QueryableNoteSearch[]> | Error)[]> {
  const userIdToKeys = groupBy(keys, (item) => item.userId.toHexString());

  const userIdToArgsToAggregateResults = Object.fromEntries(
    await Promise.all(
      Object.entries(userIdToKeys).map(async ([userIdStr, sameUserKeys]) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstUserKey = sameUserKeys[0]!;
        const userId = firstUserKey.userId;

        return [
          userIdStr,
          Object.fromEntries(
            await Promise.all(
              Object.entries(
                groupBy(sameUserKeys, (item) => searchAndPaginationId(item))
              ).map(async ([sameArgsStr, sameArgsKeys]) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const firstSameArgsKey = sameArgsKeys[0]!;

                const searchText = firstSameArgsKey.searchText;
                const pagination = firstSameArgsKey.pagination;

                // Merge queries
                const mergedQuery = mergeQueries(
                  {},
                  sameArgsKeys.map(({ searchQuery }) => searchQuery)
                );

                mergedQuery.cursor = 1;

                // Build aggregate pipeline for note
                const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
                  description: searchDescription,
                  customContext: context,
                });

                // Translate pagination appropriate for $search stage
                let limit: number | undefined;
                let sortReverse = false;
                let searchAfter: string | undefined;
                let searchBefore: string | undefined;
                if (pagination) {
                  if (isAfterPagination(pagination)) {
                    searchAfter = pagination.after;
                    if (isAfterBoundPagination(pagination)) {
                      limit = pagination.first;
                    }
                  } else if (isBeforePagination(pagination)) {
                    searchBefore = pagination.before;
                    if (isBeforeBoundPagination(pagination)) {
                      limit = pagination.last;
                    }
                  } else if (isFirstPagination(pagination)) {
                    limit = pagination.first;
                  } else if (isLastPagination(pagination)) {
                    limit = pagination.last;
                    sortReverse = true;
                  }
                }

                // Fetch from database
                const notesResult = await context.collections.notes
                  .aggregate(
                    [
                      // Find all possible notes with searchText
                      {
                        $search: {
                          index: 'collabTextsHeadText',
                          ...(searchAfter && {
                            searchAfter,
                          }),
                          ...(searchBefore && {
                            searchBefore,
                          }),
                          compound: {
                            minimumShouldMatch: 1,
                            should: [
                              {
                                text: {
                                  path: 'collabTexts.TITLE.headText.changeset',
                                  query: searchText,
                                },
                              },
                              {
                                text: {
                                  path: 'collabTexts.CONTENT.headText.changeset',
                                  query: searchText,
                                },
                              },
                            ],
                            filter: [
                              {
                                equals: {
                                  path: 'userNotes.userId',
                                  value: userId,
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
                    aggregateOptions
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
      { notesResult: Document[]; mergedQuery: MergedDeepObjectQuery<QueryableNoteSearch> }
    >
  >;

  return keys.map((key) => {
    const userResults = userIdToArgsToAggregateResults[key.userId.toHexString()];
    if (!userResults) {
      return [];
    }
    const argsResults = userResults[searchAndPaginationId(key)];
    if (!argsResults) {
      return [];
    }

    return argsResults.notesResult.map((noteResult) => {
      return queryFilterAggregateResult(
        key.searchQuery,
        argsResults.mergedQuery,
        noteResult,
        {
          descriptions: [searchDescription],
        }
      );
    });
  });
}

function searchAndPaginationId(key: QueryableNotesSearchLoadKey) {
  return key.searchText + (key.pagination ? ':' + getPaginationKey(key.pagination) : '');
}
