import { wrapResolverPreExecuteCheck } from '../../../../graphql/utils/wrap-resolver-pre-execute-check';

import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';

import type { OpenedNoteResolvers } from './../../types.generated';

export const OpenedNote: OpenedNoteResolvers = {
  closedAt: async (parent, _arg, _ctx) => {
    return (
      await parent.query({
        expireAt: 1,
      })
    )?.expireAt;
  },
  collabTextEditing: wrapResolverPreExecuteCheck(
    async (parent) => {
      const result = await parent.query({
        collabText: {
          revision: 1,
        },
      });
      return result?.collabText?.revision != null;
    },
    (parent, _arg, _ctx) => {
      return {
        query: createMapQueryFn(parent.query)<
          NonNullable<NonNullable<QueryableNoteUser['openNote']>['collabText']>
        >()(
          (query) => ({ collabText: query }),
          (result) => {
            return result.collabText;
          }
        ),
      };
    }
  ),
};
