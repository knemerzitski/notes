import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { wrapResolverPreExecuteCheck } from '../../../utils/wrap-resolver-pre-execute-check';
import type { PublicUserNoteLinkResolvers } from '../../types.generated';

export const PublicUserNoteLink: Pick<PublicUserNoteLinkResolvers, 'collabTextState'> = {
  collabTextState: wrapResolverPreExecuteCheck(
    async (parent) =>
      (
        await parent.query({
          openNote: {
            collabText: {
              revision: 1,
            },
          },
        })
      )?.openNote?.collabText != null,
    (parent, _arg, _ctx) => {
      return {
        query: createMapQueryFn(parent.query)<
          NonNullable<NonNullable<QueryableNoteUser['openNote']>['collabText']>
        >()(
          (query) => ({ openNote: { collabText: query } }),
          (result) => {
            return result.openNote?.collabText;
          }
        ),
      };
    }
  ),
};
