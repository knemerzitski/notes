import { QueryableNote } from '../../../../../mongodb/descriptions/note';
import { QueryableSearchNote } from '../../../../../mongodb/loaders/notes-search';
import { RelayPagination } from '../../../../../mongodb/pagination/relay-array-pagination';
import { createMapQueryFn, MongoQueryFn } from '../../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../../../services/auth/auth';
import {
  PreFetchedArrayGetItemFn,
  withPreExecuteList,
} from '../../../../utils/pre-execute';
import type { QueryResolvers } from '../../../types.generated';
import { UserNoteLinkMapper } from '../../schema.mappers';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

export const userNoteLinkSearchConnection: NonNullable<
  QueryResolvers['userNoteLinkSearchConnection']
> = (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;

  assertAuthenticated(auth);
  const currentUserId = auth.session.userId;

  const first = arg.first != null ? Math.min(MAX_LIMIT, arg.first) : DEFAULT_LIMIT;
  const last = arg.last != null ? Math.min(MAX_LIMIT, arg.last) : DEFAULT_LIMIT;
  const after = arg.after ?? undefined;
  const before = arg.before ?? undefined;

  const isForwardPagination = arg.after != null || arg.first != null;

  let basePaginationOffset: number;
  let basePaginationLength: number;
  let pagination: RelayPagination<string>;
  if (isForwardPagination) {
    basePaginationOffset = 0;
    basePaginationLength = first;
    pagination = {
      after,
      first: first + 1,
    };
  } else {
    basePaginationOffset = 1;
    basePaginationLength = last;
    pagination = {
      before,
      last: last + 1,
    };
  }

  const searchText = arg.searchText;

  function getSearchOffset(searchResultSize: number) {
    if (searchResultSize > basePaginationLength) {
      return basePaginationOffset;
    } else {
      return 0;
    }
  }

  function getSearchLength(searchResultSize: number) {
    return Math.min(searchResultSize, basePaginationLength);
  }

  const notesSearchQueryFn = mongoDB.loaders.notesSearch.createQueryFn({
    userId: currentUserId,
    searchText,
    pagination,
  });

  const createSearchNoteAtIndexQueryFn: PreFetchedArrayGetItemFn<
    MongoQueryFn<typeof QueryableSearchNote>
  > = (index, updateSize) =>
    createMapQueryFn(notesSearchQueryFn)<typeof QueryableSearchNote>()(
      (query) => query,
      (notes) => {
        updateSize?.(getSearchLength(notes.length));
        return notes[getSearchOffset(notes.length) + index];
      }
    );

  const createUserNoteLinkMapper: PreFetchedArrayGetItemFn<UserNoteLinkMapper> = (
    index,
    updateSize
  ) => ({
    userId: currentUserId,
    query: createMapQueryFn(createSearchNoteAtIndexQueryFn(index, updateSize))<
      typeof QueryableNote
    >()(
      (query) => ({ note: query }),
      (result) => result.note
    ),
  });

  return {
    userNoteLinks: (ctx, info) => {
      return withPreExecuteList(createUserNoteLinkMapper, ctx, info);
    },
    edges: (ctx, info) => {
      return withPreExecuteList(
        (index, updateSize) => {
          const userNoteLinkMapper = createUserNoteLinkMapper(index, updateSize);

          return {
            node: userNoteLinkMapper,
            cursor: async () =>
              (
                await createSearchNoteAtIndexQueryFn(
                  index,
                  updateSize
                )({
                  cursor: 1,
                })
              )?.cursor,
          };
        },
        ctx,
        info
      );
    },
    pageInfo() {
      return {
        async hasNextPage() {
          if (isForwardPagination) {
            const searchResult = await notesSearchQueryFn({
              cursor: 1,
            });
            return searchResult != null && searchResult.length > basePaginationLength;
          } else {
            if (before) {
              const searchResult = await notesSearchQueryFn({
                cursor: 1,
              });
              return searchResult != null && searchResult.length > 0;
            }
            return false;
          }
        },
        async hasPreviousPage() {
          if (isForwardPagination) {
            if (after) {
              const searchResult = await notesSearchQueryFn({
                cursor: 1,
              });
              return searchResult != null && searchResult.length > 0;
            }
            return false;
          } else {
            const searchResult = await notesSearchQueryFn({
              cursor: 1,
            });
            return searchResult != null && searchResult.length > basePaginationLength;
          }
        },
        async startCursor() {
          const searchResult = await notesSearchQueryFn({
            cursor: 1,
          });
          return searchResult?.[getSearchOffset(searchResult.length)]?.cursor;
        },
        async endCursor() {
          const searchResult = await notesSearchQueryFn({
            cursor: 1,
          });
          return searchResult?.[getSearchLength(searchResult.length) - 1]?.cursor;
        },
      };
    },
  };
};
