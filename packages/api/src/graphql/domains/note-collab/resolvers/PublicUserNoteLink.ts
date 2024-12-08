import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { wrapResolverPreExecuteCheck } from '../../../utils/wrap-resolver-pre-execute-check';
import type { PublicUserNoteLinkResolvers } from '../../types.generated';

export const PublicUserNoteLink: Pick<PublicUserNoteLinkResolvers, 'open'> = {
  open: wrapResolverPreExecuteCheck(
    async (parent) => {
      const result = await parent.query({
        openNote: {
          expireAt: 1,
        },
      });
      return result?.openNote?.expireAt != null;
    },
    (parent, _arg, _ctx) => {
      return {
        query: createMapQueryFn(parent.query)<
          NonNullable<NonNullable<QueryableNoteUser['openNote']>>
        >()(
          (query) => ({ openNote: query }),
          (result) => {
            return result.openNote;
          }
        ),
      };
    }
  ),
};
