import { updateMoveCategory } from '../../../../../services/note/update-move-category';
import {
  ListAnchorPosition,
  Maybe,
  MovableNoteCategory,
  MutationmoveUserNoteLinkArgs,
  NoteCategory,
  RequireFields,
  ResolversTypes,
  type MutationResolvers,
} from '../../../types.generated';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';

export const moveUserNoteLink: NonNullable<
  MutationResolvers['moveUserNoteLink']
> = async (_parent, arg, ctx) => {
  const { mongoDB } = ctx;
  const { input } = arg;

  const currentUserId = input.authUser.id;
  const noteId = input.note.id;

  const moveResult = await updateMoveCategory({
    mongoDB,
    noteId,
    userId: currentUserId,
    categoryName: input.location?.categoryName,
    anchor: getAnchor(arg),
  });

  const payload: ResolversTypes['SignedInUserMutation'] = {
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
    prevCategoryName: moveResult.oldCategoryName as NoteCategory,
    userNoteLink: {
      userId: currentUserId,
      query: mongoDB.loaders.note.createQueryFn({
        userId: currentUserId,
        noteId,
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
  return pos === ListAnchorPosition.AFTER ? 'before' : 'after';
}

function strToAnchorPosition(pos: Maybe<'after' | 'before'>) {
  if (!pos) return;
  return pos === 'after' ? ListAnchorPosition.BEFORE : ListAnchorPosition.AFTER;
}
