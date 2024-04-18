import { ObjectId } from 'mongodb';

import { assertAuthenticated } from '../../../base/directives/auth';

import { type QueryResolvers } from '../../../types.generated';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';
import { newResolverOnlyError } from '../../../plugins/remove-resolver-only-errors';
import { RelayPagination } from '../../../../mongodb/operations/pagination/relayArrayPagination';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;
const NOTES_ARRAY_PATH = 'notes.category.default.order';

function canObjectIdCreateFromBase64(s: string) {
  return s.length === 16;
}

export const notesConnection: NonNullable<QueryResolvers['notesConnection']> = (
  _parent,
  args,
  ctx
) => {
  const { auth, datasources } = ctx;
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
  let expectedSize: number;
  if (isForwardPagination) {
    pagination = {
      after,
      first,
    };
    expectedSize = first;
  } else {
    pagination = {
      before,
      last,
    };
    expectedSize = last;
  }

  return {
    notes: () => {
      return [...new Array<undefined>(expectedSize)].map((_, index) => {
        const noteQuery = new NoteQueryMapper({
          queryDocument: async (query) => {
            const result = await datasources.notes.getNoteConnection({
              userId: currentUserId,
              userNotesArrayPath: NOTES_ARRAY_PATH,
              noteQuery: query,
              pagination,
            });
            const note = result.userNotes[index];
            if (!note) {
              throw newResolverOnlyError(`No note at index ${index}`);
            }

            return note;
          },
        });

        return noteQuery;
      });
    },
    edges: () => {
      return [...new Array<undefined>(expectedSize)].map((_, index) => {
        const noteQuery = new NoteQueryMapper({
          queryDocument: async (query) => {
            const result = await datasources.notes.getNoteConnection({
              userId: currentUserId,
              userNotesArrayPath: NOTES_ARRAY_PATH,
              noteQuery: query,
              pagination,
            });
            const note = result.userNotes[index];
            if (!note) {
              throw newResolverOnlyError(`No note at index ${index}`);
            }

            return note;
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
          const { userNotes, lastCursor } = await datasources.notes.getNoteConnection<{
            lastCursor: ObjectId | null;
          }>({
            userId: currentUserId,
            userNotesArrayPath: NOTES_ARRAY_PATH,
            noteQuery: {
              _id: 1,
            },
            pagination,
            customQuery: {
              query: {
                lastCursor: {
                  $last: `$${NOTES_ARRAY_PATH}`,
                },
              },
              group: {
                lastCursor: { $first: '$lastCursor' },
              },
            },
          });

          const endCursor = userNotes[userNotes.length - 1]?._id;
          const hasNextPage = endCursor && !endCursor.equals(lastCursor);

          return hasNextPage ?? false;
        },
        hasPreviousPage: async () => {
          const { userNotes, firstCursor } = await datasources.notes.getNoteConnection<{
            firstCursor: ObjectId | null;
          }>({
            userId: currentUserId,
            userNotesArrayPath: NOTES_ARRAY_PATH,
            noteQuery: {
              _id: 1,
            },
            pagination,
            customQuery: {
              query: {
                firstCursor: {
                  $first: `$${NOTES_ARRAY_PATH}`,
                },
              },
              group: {
                firstCursor: { $first: '$firstCursor' },
              },
            },
          });

          const startCursor = userNotes[0]?._id;
          const hasPreviousPage = startCursor && !startCursor.equals(firstCursor);

          return hasPreviousPage ?? false;
        },
        startCursor: async () => {
          const { userNotes } = await datasources.notes.getNoteConnection({
            userId: currentUserId,
            userNotesArrayPath: NOTES_ARRAY_PATH,
            noteQuery: {
              _id: 1,
            },
            pagination,
          });

          const startCursor = userNotes[0]?._id;

          return startCursor?.toString('base64');
        },
        endCursor: async () => {
          const { userNotes } = await datasources.notes.getNoteConnection({
            userId: currentUserId,
            userNotesArrayPath: NOTES_ARRAY_PATH,
            noteQuery: {
              _id: 1,
            },
            pagination,
          });

          const endCursor = userNotes[userNotes.length - 1]?._id;

          return endCursor?.toString('base64');
        },
      };
    },
  };
};
