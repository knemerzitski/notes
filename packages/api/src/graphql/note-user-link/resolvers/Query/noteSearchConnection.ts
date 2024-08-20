import { QueryableSearchNote } from '../../../../mongodb/loaders/queryable-notes-search-loader';
import { RelayPagination } from '../../../../mongodb/pagination/relay-array-pagination';
import { ObjectQueryDeep } from '../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  PreFetchedArrayGetItemFn,
  withPreFetchedArraySize,
} from '../../../utils/pre-execute';
import { NoteMapper } from '../../schema.mappers';

import type { QueryResolvers } from '../../../types.generated';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

export const noteSearchConnection: NonNullable<QueryResolvers['noteSearchConnection']> = (
  _parent,
  arg,
  ctx
) => {
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

  function loadSearchNotes(query: ObjectQueryDeep<QueryableSearchNote>) {
    return loaders.notesSearch.load({
      id: {
        userId: currentUserId,
        searchText: searchText,
        pagination,
      },
      query,
    });
  }

  const createNoteMapper: PreFetchedArrayGetItemFn<NoteMapper> = (index, updateSize) => {
    return {
      userId: currentUserId,
      query: async (query) => {
        const searchResult = await loadSearchNotes({
          note: query,
        });
        if (searchResult?.length != null) {
          updateSize(getSearchLength(searchResult.length));
        }
        return searchResult?.[getSearchOffset(searchResult.length) + index]?.note;
      },
    };
  };

  return {
    notes(ctx, info) {
      return withPreFetchedArraySize(createNoteMapper, ctx, info);
    },
    edges(ctx, info) {
      return withPreFetchedArraySize(
        (index, updateSize) => {
          const noteMapper = createNoteMapper(index, updateSize);

          return {
            node: noteMapper,
            cursor: async () => {
              const searchResult = await loadSearchNotes({
                cursor: 1,
              });
              return searchResult?.[getSearchOffset(searchResult.length) + index]?.cursor;
            },
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
