import { throwNoteNotFound } from '../../../../services/graphql/errors';
import {
  primeUpdateMoveNoteSuccess,
  updateMoveNote,
} from '../../../../services/note/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import { publishSignedInUserMutation } from '../../../user/resolvers/Subscription/signedInUserEvents';
import {
  ListAnchorPosition,
  Maybe,
  MovableNoteCategory,
  MutationmoveUserNoteLinkArgs,
  NoteCategory,
  RequireFields,
  ResolversTypes,
  type MutationResolvers,
} from './../../../types.generated';

export const moveUserNoteLink: NonNullable<
  MutationResolvers['moveUserNoteLink']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  input.location?.anchorPosition;

  const currentUserId = auth.session.userId;

  const moveResult = await updateMoveNote({
    mongoDB,
    defaultCategoryName: NoteCategory.DEFAULT,
    noteId: input.noteId,
    userId: currentUserId,
    anchorCategoryName: input.location?.categoryName,
    anchorNoteId: input.location?.anchorNoteId,
    anchorPosition: anchorPositionToStr(arg),
  });

  if (!moveResult) {
    throwNoteNotFound(input.noteId);
  }

  const anchorNoteId = moveResult.anchorNoteId;
  const payload: ResolversTypes['SignedInUserMutations'] = {
    __typename: 'MoveUserNoteLinkPayload',
    location: {
      categoryName: moveResult.categoryName as MovableNoteCategory,
      anchorPosition: strToAnchorPosition(moveResult.anchorPosition),
      anchorUserNoteLink: anchorNoteId
        ? {
            userId: currentUserId,
            query: (query) =>
              mongoDB.loaders.note.load({
                id: {
                  userId: currentUserId,
                  noteId: anchorNoteId,
                },
                query,
              }),
          }
        : null,
    },
    userNoteLink: {
      userId: currentUserId,
      query: (query) =>
        mongoDB.loaders.note.load({
          id: {
            userId: currentUserId,
            noteId: moveResult.note._id,
          },
          query,
        }),
    },
  };

  if (moveResult.modified) {
    primeUpdateMoveNoteSuccess({
      mongoDB,
      userId: currentUserId,
      move: moveResult,
    });

    await publishSignedInUserMutation(currentUserId, payload, ctx);
  }

  return payload;
};

function anchorPositionToStr(arg: RequireFields<MutationmoveUserNoteLinkArgs, 'input'>) {
  const pos = arg.input.location?.anchorPosition;
  if (!pos) return;
  return pos === ListAnchorPosition.BEFORE ? 'before' : 'after';
}

function strToAnchorPosition(pos: Maybe<'after' | 'before'>) {
  if (!pos) return;
  return pos === 'before' ? ListAnchorPosition.BEFORE : ListAnchorPosition.AFTER;
}
