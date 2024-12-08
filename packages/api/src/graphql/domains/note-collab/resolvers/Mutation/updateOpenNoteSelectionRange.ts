import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { createMapQueryFn, createValueQueryFn } from '../../../../../mongodb/query/query';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { findNoteUserMaybe } from '../../../../../services/note/note';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import { updateOpenNoteSelectionRange as service_updateOpenNoteSelectionRange } from '../../../../../services/note/update-open-note-selection-range';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishOpenNoteMutation } from '../Subscription/openNoteEvents';

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

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    noteId: input.noteId,
    userId: currentUserId,
  });

  const userNoteQuery = createMapQueryFn(noteQuery)<QueryableNoteUser>()(
    (query) => ({
      users: {
        ...query,
        _id: 1,
      },
    }),
    (note) => findNoteUserMaybe(currentUserId, note)
  );

  const payload: ResolversTypes['OpenNoteMutation'] = {
    __typename: 'UpdateOpenNoteSelectionRangePayload',
    collabTextEditing: {
      query: createValueQueryFn<
        NonNullable<NonNullable<QueryableNoteUser['openNote']>['collabText']>
      >(() => openNote.collabText),
    },
    openedNote: {
      query: createValueQueryFn<NonNullable<NonNullable<QueryableNoteUser['openNote']>>>(
        () => openNote
      ),
    },
    publicUserNoteLink: {
      noteId: input.noteId,
      query: userNoteQuery,
    },
    collabText: {
      id: CollabText_id_fromNoteQueryFn(noteQuery),
      query: mapNoteToCollabTextQueryFn(noteQuery),
    },
    note: {
      query: noteQuery,
    },
  };

  await publishOpenNoteMutation(input.noteId, payload, ctx);

  return payload;
};
