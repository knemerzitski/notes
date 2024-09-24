import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { wrapResolverPreExecuteCheck } from '../../../utils/wrap-resolver-pre-execute-check';
import type { PublicUserNoteLinkResolvers } from '../../types.generated';

export const PublicUserNoteLink: Pick<PublicUserNoteLinkResolvers, 'textEditState'> = {
  textEditState: wrapResolverPreExecuteCheck(
    async (parent) =>
      (
        await parent.query({
          editing: {
            collabText: {
              revision: 1,
            },
          },
        })
      )?.editing?.collabText != null,
    (parent, _arg, _ctx) => {
      return {
        query: createMapQueryFn(parent.query)<
          NonNullable<NonNullable<QueryableNoteUser['editing']>['collabText']>
        >()(
          (query) => ({ editing: { collabText: query } }),
          (result) => {
            return result.editing?.collabText;
          }
        ),
      };
    }
  ),
};
