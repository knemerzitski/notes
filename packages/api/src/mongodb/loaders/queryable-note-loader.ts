import { AggregateOptions, ObjectId } from 'mongodb';

import { groupBy } from '~utils/array/group-by';
import { mitt, Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';

import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { MergedObjectQueryDeep, mergeQueries } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { QueryResultDeep } from '../query/query';
import {
  QueryableNote,
  queryableNoteDescription,
} from '../schema/note/query/queryable-note';

import {
  QueryLoaderEvents,
  QueryLoader,
  QueryLoaderCacheKey,
  QueryLoaderContext,
  PrimeOptions,
} from './query-loader';

export interface QueryableNoteId {
  /**
   * Note._id
   */
  noteId: ObjectId;
  /**
   * Note.users._id
   */
  userId?: ObjectId;
}

export type QueryableNoteLoaderKey = QueryLoaderCacheKey<QueryableNoteId, QueryableNote>;

export interface QueryableNoteLoaderParams {
  eventBus?: Emitter<LoaderEvents>;
  context: GlobalContext;
}

export type QueryableNoteLoadContext = QueryLoaderContext<GlobalContext, RequestContext>;

interface GlobalContext {
  collections: Pick<
    MongoDBContext<MongoDBCollections>['collections'],
    CollectionName.NOTES | CollectionName.USERS
  >;
}

type RequestContext = AggregateOptions['session'];

export class QueryableNoteLoader {
  private readonly loader: QueryLoader<
    QueryableNoteId,
    QueryableNote,
    GlobalContext,
    RequestContext
  >;

  constructor(params: Readonly<QueryableNoteLoaderParams>) {
    const loaderEventBus = mitt<QueryLoaderEvents<QueryableNoteId, QueryableNote>>();
    if (params.eventBus) {
      loaderEventBus.on('loaded', (payload) => {
        params.eventBus?.emit('loadedNote', payload);
      });
    }

    this.loader = new QueryLoader({
      eventBus: params.eventBus ? loaderEventBus : undefined,
      batchLoadFn: (keys, context) => {
        return queryableNoteBatchLoad(keys, context);
      },
      context: params.context,
    });

    if (params.eventBus) {
      params.eventBus.on('loadedUser', (payload) => {
        this.primeNotesFromLoadedUser(payload);
      });
    }
  }

  prime(
    key: QueryableNoteLoaderKey,
    value: QueryResultDeep<QueryableNote>,
    options?: PrimeOptions
  ) {
    this.loader.prime(key, value, options);
  }

  async load(key: QueryableNoteLoaderKey, session?: RequestContext) {
    return this.loader.load(key, {
      context: session,
      skipCache: session != null,
    });
  }

  private primeNotesFromLoadedUser({ key, value }: LoaderEvents['loadedUser']) {
    if (!key.query.notes?.category) {
      return;
    }

    Object.entries(key.query.notes.category).forEach(([categoryName, categoryMeta]) => {
      const noteQuery = categoryMeta?.order?.items;
      if (!noteQuery) {
        return;
      }

      const resultCategoryMeta = value?.notes?.category?.[categoryName];
      if (!resultCategoryMeta) {
        return;
      }
      resultCategoryMeta.order?.items?.forEach((note) => {
        if (!note._id) return;
        this.loader.prime(
          {
            id: {
              noteId: note._id,
            },
            query: noteQuery,
          },
          note
        );
      });
    });
  }
}

export async function queryableNoteBatchLoad(
  keys: readonly QueryableNoteLoaderKey[],
  context: QueryableNoteLoadContext
): Promise<(QueryResultDeep<QueryableNote> | null)[]> {
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

        // Map userNote by publicId
        const noteById = notesResult.reduce<Record<string, Document>>((noteMap, note) => {
          const noteId = note._id;
          if (!(noteId instanceof ObjectId)) {
            throw new Error('Expected Note._id to be defined');
          }

          noteMap[noteId.toString()] = note;

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
      mergedQuery: MergedObjectQueryDeep<QueryableNote>;
    }
  >;

  return keys.map((key) => {
    const userResult = notesBy_userId_noteId[key.id.userId?.toString() ?? ''];
    const note = userResult?.noteById[key.id.noteId.toString()];
    if (!note) {
      return null;
    }

    return mapQueryAggregateResult(key.query, userResult.mergedQuery, note, {
      descriptions: [queryableNoteDescription],
    });
  });
}
