import { QueryableNote } from '../../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn } from '../../../../../mongodb/query/query';
import { insertShareLink } from '../../../../../services/note/insert-share-link';
import { getNoteUsersIds } from '../../../../../services/note/note';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const shareNote: NonNullable<MutationResolvers['shareNote']> = async (
  _parent,
  arg,
  ctx
) => {
  const { services, mongoDB } = ctx;
  const auth = await services.requestHeaderAuth.getAuth();

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const shareLinkResult = await insertShareLink({
    mongoDB,
    noteId: input.noteId,
    userId: currentUserId,
    readOnly: input.readOnly,
  });

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    userId: currentUserId,
    noteId: input.noteId,
  });

  const payload: ResolversTypes['SignedInUserMutation'] = {
    __typename: 'ShareNotePayload',
    shareAccess: {
      query: createMapQueryFn(noteQuery)<QueryableNote['shareLinks']>()(
        (query) => ({ shareLinks: query }),
        (result) => {
          return result.shareLinks;
        }
      ),
    },
    note: {
      query: noteQuery,
    },
  };

  if (shareLinkResult.type !== 'already_share_link') {
    const publishUsers = getNoteUsersIds(shareLinkResult.note);
    await Promise.all(
      publishUsers.map((userId) => publishSignedInUserMutation(userId, payload, ctx))
    );
  }

  return payload;
};
