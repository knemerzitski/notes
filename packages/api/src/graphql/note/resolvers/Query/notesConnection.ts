import { ObjectId } from 'mongodb';

import { RelayPagination } from '../../../../mongodb/pagination/relay-array-pagination';
import { DeepObjectQuery, MongoQuery } from '../../../../mongodb/query/query';
import { QueryableNote } from '../../../../mongodb/schema/note/query/queryable-note';
import { QueryableUser } from '../../../../mongodb/schema/user/query/queryable-user';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteCategory, type QueryResolvers } from '../../../types.generated';
import { preExecuteField } from '../../../utils/pre-execute-field';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

function canObjectIdCreateFromBase64(s: string) {
  return s.length === 16;
}

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
  args,
  ctx,
  info
) => {
  const {
    auth,
    mongodb: { loaders },
  } = ctx;
  assertAuthenticated(auth);

  // Validate before, after convertable to ObjectId
  if (
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    (args.after && !canObjectIdCreateFromBase64(args.after)) ||
    (args.before && !canObjectIdCreateFromBase64(args.before))
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

  const first = args.first != null ? Math.min(MAX_LIMIT, args.first) : DEFAULT_LIMIT;
  const last = args.last != null ? Math.min(MAX_LIMIT, args.last) : DEFAULT_LIMIT;
  const after = args.after ? ObjectId.createFromBase64(args.after) : undefined;
  const before = args.before ? ObjectId.createFromBase64(args.before) : undefined;

  const currentUserId = auth.session.user._id;

  const isForwardPagination = args.after != null || args.first != null;

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

  const categoryName = args.category ?? NoteCategory.DEFAULT;

  // TODO renname, no userNote
  function loadUser_userNote(
    noteQuery: DeepObjectQuery<QueryableNote>,
    additionalOrderQuery?: DeepObjectQuery<QueryableOrderExtra>
  ) {
    return loaders.user.load({
      userId: currentUserId,
      userQuery: {
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
        const user = await loadUser_userNote(query);
        const items = user.notes?.category?.[categoryName]?.order?.items;
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
      await preExecuteField('notes', ctx, info, {
        notes: () => {
          return [
            new NoteQueryMapper(currentUserId, {
              async query(query) {
                const user = await loadUser_userNote(query);
                actualSize =
                  actualSize ??
                  user.notes?.category?.[categoryName]?.order?.items?.length;
                return null;
              },
            }),
          ];
        },
      });
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
      await preExecuteField('edges', ctx, info, {
        edges: () => {
          const noteQuery = new NoteQueryMapper(currentUserId, {
            async query(query) {
              const user = await loadUser_userNote(query);
              actualSize =
                actualSize ?? user.notes?.category?.[categoryName]?.order?.items?.length;
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
      });
      if (!actualSize) return [];

      return [...new Array<undefined>(actualSize)].map((_, index) => {
        const noteQuery = new NoteQueryMapper(
          currentUserId,
          createNoteMongoQueryAtIndex(index)
        );

        return {
          node: () => noteQuery,
          cursor: () => {
            return noteQuery.noteId();
          },
        };
      });
    },
    pageInfo: () => {
      return {
        hasNextPage: async () => {
          const user = await loadUser_userNote(
            {
              _id: 1,
            },
            {
              lastId: 1,
            }
          );

          const order = user.notes?.category?.[categoryName]?.order;
          const endCursor = order?.items?.[order.items.length - 1]?._id;
          const lastCursor = order?.lastId;

          const hasNextPage = endCursor && !endCursor.equals(lastCursor);

          return hasNextPage ?? false;
        },
        hasPreviousPage: async () => {
          const user = await loadUser_userNote(
            {
              _id: 1,
            },
            {
              firstId: 1,
            }
          );

          const order = user.notes?.category?.[categoryName]?.order;
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
          return startNoteQuery.noteId();
        },
        endCursor: async () => {
          const endNoteQuery = new NoteQueryMapper(
            currentUserId,
            createNoteMongoQueryAtIndex(-1)
          );
          return endNoteQuery.noteId();
        },
      };
    },
  };
};
