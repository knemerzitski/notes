import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import {
  ListAnchorPosition,
  Maybe,
  MovableNoteCategory,
  MutationmoveUserNoteLinkArgs,
  RequireFields,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { updateMoveCategory } from '../../../../../services/note/update-move-category';

export const moveUserNoteLink: NonNullable<
  MutationResolvers['moveUserNoteLink']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const moveResult = await updateMoveCategory({
    mongoDB,
    noteId: input.noteId,
    userId: currentUserId,
    categoryName: input.location?.categoryName,
    anchor: getAnchor(arg),
  });

  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'MoveUserNoteLinkPayload',
    location: {
      categoryName: moveResult.categoryName as MovableNoteCategory,
      anchorPosition: strToAnchorPosition(moveResult.anchor?.position),
      anchorUserNoteLink: moveResult.anchor?.id
        ? {
            userId: currentUserId,
            query: mongoDB.loaders.note.createQueryFn({
              userId: currentUserId,
              noteId: moveResult.anchor.id,
            }),
          }
        : null,
    },
    userNoteLink: {
      userId: currentUserId,
      query: mongoDB.loaders.note.createQueryFn({
        userId: currentUserId,
        noteId: input.noteId,
      }),
    },
  };

  if (moveResult.type !== 'already_category_name') {
    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};

function getAnchor(
  arg: RequireFields<MutationmoveUserNoteLinkArgs, 'input'>
): Parameters<typeof updateMoveCategory>[0]['anchor'] {
  const position = anchorPositionToStr(arg);
  if (!arg.input.location?.anchorNoteId || !position) {
    return;
  }

  return {
    noteId: arg.input.location.anchorNoteId,
    position,
  };
}

function anchorPositionToStr(arg: RequireFields<MutationmoveUserNoteLinkArgs, 'input'>) {
  const pos = arg.input.location?.anchorPosition;
  if (!pos) return;
  return pos === ListAnchorPosition.BEFORE ? 'before' : 'after';
}

function strToAnchorPosition(pos: Maybe<'after' | 'before'>) {
  if (!pos) return;
  return pos === 'before' ? ListAnchorPosition.BEFORE : ListAnchorPosition.AFTER;
}
