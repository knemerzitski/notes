import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
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
  const { mongoDB, connectionId } = ctx;

  const { input } = arg;
  const noteId = input.note.id;

  const currentUserId = input.authUser.id;

  const { openNote } = await service_updateOpenNoteSelectionRange({
    mongoDB,
    connectionId,
    noteId,
    userId: currentUserId,
    revision: input.revision,
    selection: {
      start: input.selectionRange.start,
      end: input.selectionRange.end ?? undefined,
    },
    openNoteDuration: ctx.options.note.openNoteDuration,
  });

  const noteQuery = mongoDB.loaders.note.createQueryFn({
    noteId,
    userId: currentUserId,
  });

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
    userNoteLink: {
      userId: currentUserId,
      query: noteQuery,
    },
    collabText: {
      id: CollabText_id_fromNoteQueryFn(noteQuery),
      query: mapNoteToCollabTextQueryFn(noteQuery),
    },
    note: {
      query: noteQuery,
    },
  };

  await publishOpenNoteMutation(noteId, payload, ctx);

  return payload;
};
