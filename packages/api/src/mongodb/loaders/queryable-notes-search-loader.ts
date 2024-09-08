import { AggregateOptions, ObjectId } from 'mongodb';

import { groupBy } from '~utils/array/group-by';
import { Emitter, mitt } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../context';
import { LoaderEvents } from '../loaders';

import {
  getPaginationKey,
  RelayAfterBoundPagination,
  RelayAfterPagination,
  RelayBeforeBoundPagination,
  RelayBeforePagination,
  RelayFirstPagination,
  RelayLastPagination,
  RelayPagination,
} from '../pagination/relay-array-pagination';

import { DeepAnyDescription } from '../query/description';
import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { MergedQueryDeep, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { MongoQueryFn, PartialQueryResultDeep, QueryDeep } from '../query/query';
import { fieldsRemoved } from '../query/utils/fields-removed';
import { NoteSearchIndexName } from '../schema/note';
import {
  QueryableNote,
  QueryableNoteContext,
  queryableNoteDescription,
} from '../descriptions/note';

import {
  CreateQueryFnOptions,
  LoadOptions,
  QueryLoader,
  QueryLoaderContext,
  QueryLoaderEvents,
  QueryLoaderKey,
  SessionOptions,
} from './query-loader';
import { array, Infer, InferRaw, object, string } from 'superstruct';
import { STRUCT_STRING } from '../constants';

export interface QueryableNotesSearchId {
  /**
   * Note.users._id
   */
  userId: ObjectId;
  /**
   * Text to find in note
   */
  searchText: string;
  /**
   * Paginate search results
   */
  pagination?: RelayPagination<string>;
}

export const QueryableSearchNote = object({
  note: QueryableNote,
  cursor: string(),
});

export const QueryableSearchNotes = array(QueryableSearchNote);

export type QueryableNotesSearchLoaderKey = QueryLoaderKey<
  QueryableNotesSearchId,
  InferRaw<typeof QueryableSearchNotes>,
  QueryableNotesSearchLoadContext
>['cache'];

export interface QueryableNotesSearchLoaderParams {
  eventBus?: Emitter<LoaderEvents>;
  context: GlobalContext;
}

export type QueryableNotesSearchLoadContext = QueryLoaderContext<
  GlobalContext,
  RequestContext
>;

interface GlobalContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES | CollectionName.USERS
  >;
}

type RequestContext = AggregateOptions['session'];

export class QueryableNotesSearchLoader {
  private readonly loader: QueryLoader<
    QueryableNotesSearchId,
    typeof QueryableSearchNotes,
    GlobalContext,
    RequestContext
  >;

  constructor(params: Readonly<QueryableNotesSearchLoaderParams>) {
    const loaderEventBus =
      mitt<QueryLoaderEvents<QueryableNotesSearchId, typeof QueryableSearchNotes>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedNotesSearch', payload);
      });
    }

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => {
        return queryableNotesSearchBatchLoad(keys, context);
      },
      context: params.context,
      struct: QueryableSearchNotes,
    });
  }

  load<
    V extends QueryDeep<Infer<typeof QueryableSearchNotes>>,
    T extends 'any' | 'raw' | 'validated' = 'any',
  >(
    key: Parameters<typeof this.loader.load<V, T>>[0],
    options?: SessionOptions<LoadOptions<RequestContext, T>>
  ): ReturnType<typeof this.loader.load<V, T>> {
    return this.loader.load(key, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }

  createQueryFn(
    id: QueryableNotesSearchId,
    options?: SessionOptions<
      CreateQueryFnOptions<RequestContext, typeof QueryableSearchNotes>
    >
  ): MongoQueryFn<typeof QueryableSearchNotes> {
    return this.loader.createQueryFn(id, {
      ...options,
      context: options?.session,
      clearCache: options?.session != null,
    });
  }
}

const searchDescription: DeepAnyDescription<
  InferRaw<typeof QueryableSearchNotes>,
  unknown,
  QueryableNoteContext
> = {
  note: fieldsRemoved(queryableNoteDescription, ['$mapLastProject']),
};

export async function queryableNotesSearchBatchLoad(
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
                  description: searchDescription,
                  customContext: context.global,
                });

                // Translate pagination appropriate for $search stage
                let limit: number | undefined;
                let sortReverse = false;
                let searchAfter: string | undefined;
                let searchBefore: string | undefined;
                if (pagination) {
                  if (RelayAfterPagination(STRUCT_STRING).is(pagination)) {
                    searchAfter = pagination.after;
                    if (RelayAfterBoundPagination(STRUCT_STRING).is(pagination)) {
                      limit = pagination.first;
                    }
                  } else if (RelayBeforePagination(STRUCT_STRING).is(pagination)) {
                    searchBefore = pagination.before;
                    if (RelayBeforeBoundPagination(STRUCT_STRING).is(pagination)) {
                      limit = pagination.last;
                    }
                  } else if (RelayFirstPagination.is(pagination)) {
                    limit = pagination.first;
                  } else if (RelayLastPagination.is(pagination)) {
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
                                  path: 'collab.texts.v.headText.changeset',
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
        descriptions: [searchDescription],
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
