import { QueryableNote } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { wrapResolverPreExecuteCheck } from '../../../utils/wrap-resolver-pre-execute-check';
import type { NoteResolvers } from './../../types.generated';

export const Note: Pick<NoteResolvers, 'shareAccess'> = {
  shareAccess: wrapResolverPreExecuteCheck(
    async (parent) =>
      (
        await parent.query({
          shareNoteLinks: {
            _id: 1,
          },
        })
      )?.shareNoteLinks != null,
    (parent, _arg, _ctx) => {
      return {
        query: createMapQueryFn(parent.query)<
          typeof QueryableNote.schema.shareNoteLinks
        >()(
          (query) => ({ shareNoteLinks: query }),
          (result) => {
            return result.shareNoteLinks;
          }
        ),
      };
    }
  ),
};
