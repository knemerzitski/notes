import { GraphQLError } from 'graphql';
import { AggregateOptions, ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { groupBy } from '~utils/array/group-by';
import { mitt, Emitter } from '~utils/mitt-unsub';

import { CollectionName, MongoDBCollections } from '../collections';
import { MongoDBContext } from '../lambda-context';
import { LoaderEvents } from '../loaders';

import { mapQueryAggregateResult } from '../query/map-query-aggregate-result';
import { mergeQueries, MergedDeepObjectQuery } from '../query/merge-queries';
import { mergedQueryToPipeline } from '../query/merged-query-to-pipeline';
import { DeepQueryResult } from '../query/query';
import {
  QueryableNote,
  queryableNoteDescription,
} from '../schema/note/query/queryable-note';

import {
  QueryLoaderEvents,
  QueryLoader,
  QueryLoaderCacheKey,
  QueryLoaderContext,
} from './query-loader';


export interface QueryableNoteId {
  /**
   * Note.userNotes.userId
   */
  userId: ObjectId;
  /**
   * Note.publicId
   */
  publicId: string;
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
    CollectionName.NOTES
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

  async load(key: QueryableNoteLoaderKey, session?: RequestContext) {
    return this.loader.load(key, {
      context: session,
      skipCache: session != null,
    });
  }

  private primeNotesFromLoadedUser({ key, value }: LoaderEvents['loadedUser']) {
    if (!key.userQuery.notes?.category) {
      return;
    }

    const userId = key.userId;
    Object.entries(key.userQuery.notes.category).forEach(
      ([categoryName, categoryMeta]) => {
        const noteQuery = categoryMeta?.order?.items?.$query;
        if (!noteQuery) {
          return;
        }

        const resultCategoryMeta = value.notes?.category?.[categoryName];
        if (!resultCategoryMeta) {
          return;
        }
        resultCategoryMeta.order?.items?.forEach((note) => {
          if (!note.publicId) return;
          this.loader.prime(
            {
              id: {
                userId,
                publicId: note.publicId,
              },
              query: noteQuery,
            },
            note
          );
        });
      }
    );
  }
}

export async function queryableNoteBatchLoad(
  keys: readonly QueryableNoteLoaderKey[],
  context: QueryableNoteLoadContext
): Promise<(DeepQueryResult<QueryableNote> | Error)[]> {
  const keysByUserId = groupBy(keys, ({ id: { userId } }) => userId.toString('hex'));

  const notesBy_userId_publicId = Object.fromEntries(
    await Promise.all(
      Object.entries(keysByUserId).map(async ([userIdStr, sameUserLoadKeys]) => {
        const userId = ObjectId.createFromHexString(userIdStr);

        // Gather publicIds
        const allPublicIds = sameUserLoadKeys.map(({ id: { publicId } }) => publicId);

        // Merge queries
        const mergedQuery = mergeQueries(
          {},
          sameUserLoadKeys.map(({ query }) => query)
        );

        // publicId is required later after aggregate
        mergedQuery.publicId = 1;

        // Build aggregate pipeline
        const aggregatePipeline = mergedQueryToPipeline(mergedQuery, {
          description: queryableNoteDescription,
          customContext: context,
        });

        // Fetch from database
        const notesResult = await context.global.collections.notes
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
            {
              session: context.request,
            }
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
    const userResult = notesBy_userId_publicId[key.id.userId.toString()];
    const note = userResult?.noteBy_publicId[key.id.publicId];
    if (!note) {
      return new GraphQLError(`Note '${key.id.publicId}' not found`, {
        extensions: {
          code: GraphQLErrorCode.NOT_FOUND,
        },
      });
    }

    return mapQueryAggregateResult(key.query, userResult.mergedQuery, note, {
      descriptions: [queryableNoteDescription],
    });
  });
}
