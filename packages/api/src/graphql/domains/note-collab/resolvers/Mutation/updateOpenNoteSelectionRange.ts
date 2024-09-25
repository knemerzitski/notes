import { createValueQueryFn } from '../../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishOpenNoteMutation } from '../Subscription/openNoteEvents';
import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { updateOpenNoteSelectionRange as service_updateOpenNoteSelectionRange } from '../../../../../services/note/update-open-note-selection-range';

export const updateOpenNoteSelectionRange: NonNullable<
  MutationResolvers['updateOpenNoteSelectionRange']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB, connectionId } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  const currentUserId = auth.session.userId;

  const { openNote } = await service_updateOpenNoteSelectionRange({
    mongoDB,
    connectionId,
    noteId: input.noteId,
    userId: currentUserId,
    revision: input.revision,
    selection: {
      start: input.selectionRange.start,
      end: input.selectionRange.end ?? undefined,
    },
    openNoteDuration: ctx.options?.note?.openNoteDuration,
  });

  const userQuery = mongoDB.loaders.user.createQueryFn({
    userId: currentUserId,
  });
  const noteQuery = mongoDB.loaders.note.createQueryFn({
    noteId: input.noteId,
    userId: currentUserId,
  });

  const payload: ResolversTypes['OpenNoteMutations'] = {
    __typename: 'UpdateOpenNoteSelectionRangePayload',
    collabTextState: {
      query: createValueQueryFn<
        NonNullable<NonNullable<QueryableNoteUser['openNote']>['collabText']>
      >(() => openNote.collabText),
    },
    collabText: {
      id: CollabText_id_fromNoteQueryFn(noteQuery),
      query: mapNoteToCollabTextQueryFn(noteQuery),
    },
    user: {
      query: userQuery,
    },
    note: {
      query: noteQuery,
    },
  };

  await publishOpenNoteMutation(input.noteId, payload, ctx);

  return payload;
};
