import { QueryableSearchNote } from '../../../../mongodb/loaders/queryable-notes-search-loader';
import { RelayPagination } from '../../../../mongodb/pagination/relay-array-pagination';
import { DeepObjectQuery } from '../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../base/directives/auth';
import { customExecuteFields } from '../../../utils/custom-execute-fields';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';

import type { QueryResolvers } from './../../../types.generated';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

export const notesSearchConnection: NonNullable<
  QueryResolvers['notesSearchConnection']
> = (_parent, arg, ctx, info) => {
  const {
    auth,
    mongodb: { loaders },
  } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id;

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

  function loadSearchNotes(query: DeepObjectQuery<QueryableSearchNote>) {
    return loaders.notesSearch.load({
      id: {
        userId: currentUserId,
        searchText: searchText,
        pagination,
      },
      query,
    });
  }

  return {
    async notes() {
      let actualSize: undefined | number;
      await customExecuteFields(
        {
          notes: () => {
            return [
              new NoteQueryMapper(currentUserId, {
                async query(query) {
                  const searchResult = await loadSearchNotes({
                    note: query,
                  });
                  actualSize = searchResult?.length;
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

      return [...new Array<undefined>(getSearchLength(actualSize))].map((_, index) => {
        const noteQuery = new NoteQueryMapper(currentUserId, {
          query: async (query) => {
            const searchResult = await loadSearchNotes({
              note: query,
            });
            return searchResult?.[getSearchOffset(searchResult.length) + index]?.note;
          },
        });

        return noteQuery;
      });
    },
    async edges() {
      let actualSize: undefined | number;
      await customExecuteFields(
        {
          edges: () => {
            const noteQuery = new NoteQueryMapper(currentUserId, {
              async query(query) {
                const searchResult = await loadSearchNotes({
                  note: query,
                });
                actualSize = searchResult?.length;
                return null;
              },
            });

            return [
              {
                node: () => noteQuery,
                cursor: () => null,
              },
            ];
          },
        },
        ctx,
        info
      );
      if (!actualSize) return [];

      return [...new Array<undefined>(getSearchLength(actualSize))].map((_, index) => ({
        node: () =>
          new NoteQueryMapper(currentUserId, {
            query: async (query) => {
              const searchResult = await loadSearchNotes({
                note: query,
              });
              return searchResult?.[getSearchOffset(searchResult.length) + index]?.note;
            },
          }),
        cursor: async () => {
          const searchResult = await loadSearchNotes({
            cursor: 1,
          });
          return searchResult?.[getSearchOffset(searchResult.length) + index]?.cursor;
        },
      }));
    },
    pageInfo() {
      return {
        async hasNextPage() {
          if (isForwardPagination) {
            const searchResult = await loadSearchNotes({
              cursor: 1,
            });
            return searchResult != null && searchResult.length > basePaginationLength;
          } else {
            if (before) {
              const searchResult = await loadSearchNotes({
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
              const searchResult = await loadSearchNotes({
                cursor: 1,
              });
              return searchResult != null && searchResult.length > 0;
            }
            return false;
          } else {
            const searchResult = await loadSearchNotes({
              cursor: 1,
            });
            return searchResult != null && searchResult.length > basePaginationLength;
          }
        },
        async startCursor() {
          const searchResult = await loadSearchNotes({
            cursor: 1,
          });
          return searchResult?.[getSearchOffset(searchResult.length)]?.cursor;
        },
        async endCursor() {
          const searchResult = await loadSearchNotes({
            cursor: 1,
          });
          return searchResult?.[getSearchLength(searchResult.length) - 1]?.cursor;
        },
      };
    },
  };
};
