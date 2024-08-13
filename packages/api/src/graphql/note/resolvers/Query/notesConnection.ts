import { ObjectId } from 'mongodb';

import { RelayPagination } from '../../../../mongodb/pagination/relay-array-pagination';
import { DeepObjectQuery, MongoQuery } from '../../../../mongodb/query/query';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { QueryableUser } from '../../../../mongodb/schema/user/query/queryable-user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { isObjectIdStr, strToObjectId } from '../../../base/resolvers/ObjectID';
import { NoteCategory, type QueryResolvers } from '../../../types.generated';
import { customExecuteFields } from '../../../utils/custom-execute-fields';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

type ExtractCategoryType<T> = T extends {
  [Key in string]?: infer U;
}
  ? U
  : never;
type QueryableOrderExtra = Omit<
  ExtractCategoryType<QueryableUser['notes']['category']>['order'],
  'items'
>;

export const notesConnection: NonNullable<QueryResolvers['notesConnection']> = (
  _parent,
  arg,
  ctx,
  info
) => {
  const {
    auth,
    mongodb: { loaders },
  } = ctx;

  assertAuthenticated(auth);
  const currentUserId = auth.session.user._id;

  // Validate before, after convertable to ObjectId
  if (
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    (arg.after && !isObjectIdStr(arg.after)) ||
    (arg.before && !isObjectIdStr(arg.before))
  ) {
    return {
      notes: () => [],
      edges: () => [],
      pageInfo: () => ({
        hasNextPage: () => false,
        hasPreviousPage: () => false,
        startCursor: () => null,
        endCursor: () => null,
      }),
    };
  }

  const first = arg.first != null ? Math.min(MAX_LIMIT, arg.first) : DEFAULT_LIMIT;
  const last = arg.last != null ? Math.min(MAX_LIMIT, arg.last) : DEFAULT_LIMIT;
  const after = arg.after ? strToObjectId(arg.after) : undefined;
  const before = arg.before ? strToObjectId(arg.before) : undefined;

  const isForwardPagination = arg.after != null || arg.first != null;

  let pagination: RelayPagination<ObjectId>;
  if (isForwardPagination) {
    pagination = {
      after,
      first,
    };
  } else {
    pagination = {
      before,
      last,
    };
  }

  // TODO first note should be newest..

  const categoryName = arg.category ?? NoteCategory.DEFAULT;

  function loadUser(
    noteQuery: DeepObjectQuery<QueryableNote>,
    additionalOrderQuery?: DeepObjectQuery<QueryableOrderExtra>
  ) {
    return loaders.user.load({
      id: {
        userId: currentUserId,
      },
      query: {
        notes: {
          category: {
            [categoryName]: {
              order: {
                ...additionalOrderQuery,
                items: {
                  $pagination: pagination,
                  $query: noteQuery,
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   *
   * @param index negative value counts from end, -1 is last item
   * @returns
   */
  function createNoteMongoQueryAtIndex(index: number): MongoQuery<QueryableNote> {
    return {
      query: async (query) => {
        const user = await loadUser(query);
        const items = user?.notes?.category?.[categoryName]?.order?.items;
        if (!items) return;

        const realIndex = index < 0 ? index + items.length : index;

        return items[realIndex];
      },
    };
  }

  return {
    notes: async () => {
      // Pre resolve to build query and fetch with dataloader to figure out list size
      let actualSize: undefined | number;
      await customExecuteFields(
        {
          notes: () => {
            return [
              new NoteQueryMapper(currentUserId, {
                async query(query) {
                  const user = await loadUser(query);
                  actualSize =
                    actualSize ??
                    user?.notes?.category?.[categoryName]?.order?.items?.length;
                  return null;
                },
              }),
            ];
          },
        },
        ctx,
        info
      );
      if (!actualSize) return [];

      return [...new Array<undefined>(actualSize)].map((_, index) => {
        const noteQuery = new NoteQueryMapper(
          currentUserId,
          createNoteMongoQueryAtIndex(index)
        );

        return noteQuery;
      });
    },
    edges: async () => {
      // Pre resolve to build query and fetch with dataloader to figure out list size
      let actualSize: undefined | number;
      await customExecuteFields(
        {
          edges: () => {
            const noteQuery = new NoteQueryMapper(currentUserId, {
              async query(query) {
                const user = await loadUser(query);
                actualSize =
                  actualSize ??
                  user?.notes?.category?.[categoryName]?.order?.items?.length;
                return null;
              },
            });

            return [
              {
                node: () => noteQuery,
                cursor: () => {
                  return noteQuery.id();
                },
              },
            ];
          },
        },
        ctx,
        info
      );
      if (!actualSize) return [];

      return [...new Array<undefined>(actualSize)].map((_, index) => {
        const noteQuery = new NoteQueryMapper(
          currentUserId,
          createNoteMongoQueryAtIndex(index)
        );

        return {
          node: () => noteQuery,
          cursor: () => {
            return noteQuery.noteIdStr();
          },
        };
      });
    },
    pageInfo: () => {
      return {
        hasNextPage: async () => {
          const user = await loadUser(
            {
              _id: 1,
            },
            {
              lastId: 1,
            }
          );

          const order = user?.notes?.category?.[categoryName]?.order;
          const endCursor = order?.items?.[order.items.length - 1]?._id;
          const lastCursor = order?.lastId;

          const hasNextPage = endCursor && !endCursor.equals(lastCursor);

          return hasNextPage ?? false;
        },
        hasPreviousPage: async () => {
          const user = await loadUser(
            {
              _id: 1,
            },
            {
              firstId: 1,
            }
          );

          const order = user?.notes?.category?.[categoryName]?.order;
          const startCursor = order?.items?.[0]?._id;
          const firstCursor = order?.firstId;

          const hasPreviousPage = startCursor && !startCursor.equals(firstCursor);

          return hasPreviousPage ?? false;
        },
        startCursor: async () => {
          const startNoteQuery = new NoteQueryMapper(
            currentUserId,
            createNoteMongoQueryAtIndex(0)
          );
          return startNoteQuery.noteIdStr();
        },
        endCursor: async () => {
          const endNoteQuery = new NoteQueryMapper(
            currentUserId,
            createNoteMongoQueryAtIndex(-1)
          );
          return endNoteQuery.noteIdStr();
        },
      };
    },
  };
};
