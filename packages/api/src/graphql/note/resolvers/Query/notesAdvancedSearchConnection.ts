import { QueryableNoteSearch } from '../../../../mongodb/loaders/notes-search-batch-load';
import { RelayPagination } from '../../../../mongodb/pagination/relay-array-pagination';
import { DeepObjectQuery } from '../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../base/directives/auth';
import { preExecuteField } from '../../../utils/pre-execute-field';
import { NoteQueryMapper } from '../../mongo-query-mapper/note';

import type { QueryResolvers } from './../../../types.generated';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

export const notesAdvancedSearchConnection: NonNullable<
  QueryResolvers['notesAdvancedSearchConnection']
> = (_parent, args, ctx, info) => {
  const {
    auth,
    mongodb: { loaders },
  } = ctx;

  assertAuthenticated(auth);

  const first = args.first != null ? Math.min(MAX_LIMIT, args.first) : DEFAULT_LIMIT;
  const last = args.last != null ? Math.min(MAX_LIMIT, args.last) : DEFAULT_LIMIT;
  const after = args.after ?? undefined;
  const before = args.before ?? undefined;

  const searchText = args.searchText;

  const currentUserId = auth.session.user._id;

  const isForwardPagination = args.after != null || args.first != null;

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

  function loadSearchNotes(searchQuery: DeepObjectQuery<QueryableNoteSearch>) {
    return loaders.notesSearch.load({
      userId: currentUserId,
      searchText: searchText,
      pagination,
      searchQuery,
    });
  }

  return {
    async notes() {
      let resultCount: undefined | number;
      await preExecuteField('notes', ctx, info, {
        notes: () => {
          return [
            new NoteQueryMapper(currentUserId, {
              async query(query) {
                const searchResult = await loadSearchNotes({
                  note: query,
                });
                resultCount = searchResult.length;
                return null;
              },
            }),
          ];
        },
      });
      if (!resultCount) return [];

      return [...new Array<undefined>(getSearchLength(resultCount))].map((_, index) => {
        const noteQuery = new NoteQueryMapper(currentUserId, {
          query: async (query) => {
            const searchResult = await loadSearchNotes({
              note: query,
            });
            return searchResult[getSearchOffset(searchResult.length) + index]?.note;
          },
        });

        return noteQuery;
      });
    },
    edges() {
      throw new Error('Not implemented');
    },
    pageInfo() {
      return {
        async hasNextPage() {
          if (isForwardPagination) {
            const searchResult = await loadSearchNotes({
              cursor: 1,
            });
            return searchResult.length > basePaginationLength;
          } else {
            if (before) {
              const searchResult = await loadSearchNotes({
                cursor: 1,
              });
              return searchResult.length > 0;
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
              return searchResult.length > 0;
            }
            return false;
          } else {
            const searchResult = await loadSearchNotes({
              cursor: 1,
            });
            return searchResult.length > basePaginationLength;
          }
        },
        async startCursor() {
          const searchResult = await loadSearchNotes({
            cursor: 1,
          });
          return searchResult[getSearchOffset(searchResult.length)]?.cursor;
        },
        async endCursor() {
          const searchResult = await loadSearchNotes({
            cursor: 1,
          });
          return searchResult[getSearchLength(searchResult.length) - 1]?.cursor;
        },
      };
    },
  };
};
