import { ObjectId } from 'mongodb';

import { RelayPagination } from '../../../../mongodb/pagination/relayArrayPagination';
import { assertAuthenticated } from '../../../base/directives/auth';
import { NoteCategory, type QueryResolvers } from '../../../types.generated';
import preExecuteField from '../../../utils/preExecuteField';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

function canObjectIdCreateFromBase64(s: string) {
  return s.length === 16;
}

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

  return {
    notes: async () => {
      // Pre resolve to build query and fetch with dataloader to figure out list size
      let actualSize: undefined | number;
      await preExecuteField('notes', ctx, info, {
        notes: () => {
          return [
            new NoteQueryMapper({
              async query(query) {
                const result = await loaders.user.load({
                  userId: currentUserId,
                  userQuery: {
                    notes: {
                      category: {
                        [categoryName]: {
                          order: {
                            items: {
                              $pagination: pagination,
                              $query: query,
                            },
                          },
                        },
                      },
                    },
                  },
                });
                actualSize =
                  actualSize ??
                  result.notes?.category?.[categoryName]?.order?.items?.length;
                return null;
              },
            }),
          ];
        },
      });
      if (!actualSize) return [];

      return [...new Array<undefined>(actualSize)].map((_, index) => {
        const noteQuery = new NoteQueryMapper({
          query: async (query) => {
            const result = await loaders.user.load({
              userId: currentUserId,
              userQuery: {
                notes: {
                  category: {
                    [categoryName]: {
                      order: {
                        items: {
                          $pagination: pagination,
                          $query: query,
                        },
                      },
                    },
                  },
                },
              },
            });
            return result.notes?.category?.[categoryName]?.order?.items?.[index];
          },
        });

        return noteQuery;
      });
    },
    edges: async () => {
      // Pre resolve to build query and fetch with dataloader to figure out list size
      let actualSize: undefined | number;
      await preExecuteField('edges', ctx, info, {
        edges: () => {
          const noteQuery = new NoteQueryMapper({
            async query(query) {
              const result = await loaders.user.load({
                userId: currentUserId,
                userQuery: {
                  notes: {
                    category: {
                      [categoryName]: {
                        order: {
                          items: {
                            $pagination: pagination,
                            $query: query,
                          },
                        },
                      },
                    },
                  },
                },
              });
              actualSize =
                actualSize ??
                result.notes?.category?.[categoryName]?.order?.items?.length;
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
        const noteQuery = new NoteQueryMapper({
          query: async (query) => {
            const result = await loaders.user.load({
              userId: currentUserId,
              userQuery: {
                notes: {
                  category: {
                    [categoryName]: {
                      order: {
                        items: {
                          $pagination: pagination,
                          $query: query,
                        },
                      },
                    },
                  },
                },
              },
            });
            return result.notes?.category?.[categoryName]?.order?.items?.[index];
          },
        });

        return {
          node: () => noteQuery,
          cursor: () => {
            return noteQuery.id();
          },
        };
      });
    },
    pageInfo: () => {
      return {
        hasNextPage: async () => {
          const result = await loaders.user.load({
            userId: currentUserId,
            userQuery: {
              notes: {
                category: {
                  [categoryName]: {
                    order: {
                      items: {
                        $pagination: pagination,
                        $query: {
                          _id: 1,
                        },
                      },
                      lastId: 1,
                    },
                  },
                },
              },
            },
          });

          const order = result.notes?.category?.[categoryName]?.order;
          const endCursor = order?.items?.[order.items.length - 1]?._id;
          const lastCursor = order?.lastId;

          const hasNextPage = endCursor && !endCursor.equals(lastCursor);

          return hasNextPage ?? false;
        },
        hasPreviousPage: async () => {
          const result = await loaders.user.load({
            userId: currentUserId,
            userQuery: {
              notes: {
                category: {
                  [categoryName]: {
                    order: {
                      items: {
                        $pagination: pagination,
                        $query: {
                          _id: 1,
                        },
                      },
                      firstId: 1,
                    },
                  },
                },
              },
            },
          });

          const order = result.notes?.category?.[categoryName]?.order;
          const startCursor = order?.items?.[0]?._id;
          const firstCursor = order?.firstId;

          const hasPreviousPage = startCursor && !startCursor.equals(firstCursor);

          return hasPreviousPage ?? false;
        },
        startCursor: async () => {
          const result = await loaders.user.load({
            userId: currentUserId,
            userQuery: {
              notes: {
                category: {
                  [categoryName]: {
                    order: {
                      items: {
                        $pagination: pagination,
                        $query: {
                          _id: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          const order = result.notes?.category?.[categoryName]?.order;
          const startCursor = order?.items?.[0]?._id;

          return startCursor?.toString('base64');
        },
        endCursor: async () => {
          const result = await loaders.user.load({
            userId: currentUserId,
            userQuery: {
              notes: {
                category: {
                  [categoryName]: {
                    order: {
                      items: {
                        $pagination: pagination,
                        $query: {
                          _id: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          const order = result.notes?.category?.[categoryName]?.order;
          const endCursor = order?.items?.[order.items.length - 1]?._id;

          return endCursor?.toString('base64');
        },
      };
    },
  };
};
