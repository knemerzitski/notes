import { QueryableNoteSearch } from '../../../../mongodb/loaders/notesSearchBatchLoad';
import { RelayPagination } from '../../../../mongodb/pagination/relayArrayPagination';
import { DeepObjectQuery } from '../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../base/directives/auth';
import preExecuteField from '../../../utils/preExecuteField';
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

  let pagination: RelayPagination<string>;
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

      return [...new Array<undefined>(resultCount)].map((_, index) => {
        const noteQuery = new NoteQueryMapper(currentUserId, {
          query: async (query) => {
            const searchResult = await loadSearchNotes({
              note: query,
            });
            return searchResult[index]?.note;
          },
        });

        return noteQuery;
      });
    },
    edges() {
      throw new Error('Not implemented');
    },
    pageInfo() {
      throw new Error('Not implemented');
    },
  };
};
