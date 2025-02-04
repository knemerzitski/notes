import { QueryableNoteUser } from '../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../mongodb/query/query';
import { findNoteUserMaybe } from '../../../../services/note/note';
import { unwrapResolver } from '../../../utils/unwrap-resolver';
import { wrapResolverPreExecuteCheck } from '../../../utils/wrap-resolver-pre-execute-check';
import { UserNoteLinkMapper } from '../../note-user-link/schema.mappers';

import type { UserNoteLinkResolvers } from './../../types.generated';

function createNoteUserQuery(parent: UserNoteLinkMapper) {
  return createMapQueryFn(parent.query)<QueryableNoteUser>()(
    (query) => ({
      users: {
        ...query,
        _id: 1,
      },
    }),
    async (note) => findNoteUserMaybe(await unwrapResolver(parent.userId), note)
  );
}

export const UserNoteLink: Pick<UserNoteLinkResolvers, 'open'> = {
  open: wrapResolverPreExecuteCheck(
    async (parent) => {
      const noteUser = await createNoteUserQuery(parent)({
        openNote: {
          expireAt: 1,
        },
      });

      return noteUser?.openNote?.expireAt != null;
    },
    (parent, _arg, _ctx) => {
      return {
        query: createMapQueryFn(createNoteUserQuery(parent))<
          NonNullable<NonNullable<QueryableNoteUser['openNote']>>
        >()(
          (query) => ({
            openNote: query,
          }),
          (result) => result.openNote
        ),
      };
    }
  ),
};
