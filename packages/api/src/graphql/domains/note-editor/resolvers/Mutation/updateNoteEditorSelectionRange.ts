import { GraphQLError } from 'graphql';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
import { DBNoteEditingSchema } from '../../../../../mongodb/schema/note-editing';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { findNoteUser } from '../../../../../services/note/note';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishNoteEditorMutation } from '../Subscription/noteEditorEvents';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { NoteNotFoundServiceError } from '../../../../../services/note/errors';
import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { SelectionRangeSchema } from '../../../../../mongodb/schema/collab-text';

export const updateNoteEditorSelectionRange: NonNullable<
  MutationResolvers['updateNoteEditorSelectionRange']
> = async (_parent, arg, ctx) => {
  const { auth, mongoDB, connectionId } = ctx;
  assertAuthenticated(auth);

  const { input } = arg;

  if (!connectionId) {
    // TODO create util function that asserts connectionId
    throw new GraphQLError(
      `Expected connectionId to be defined in header "${CustomHeaderName.WS_CONNECTION_ID}"`,
      {
        extensions: {
          code: GraphQLErrorCode.INVALID_INPUT,
        },
      }
    );
  }

  const currentUserId = auth.session.userId;

  const note = await mongoDB.loaders.note.load({
    id: {
      userId: currentUserId,
      noteId: input.noteId,
    },
    query: {
      _id: 1,
      users: {
        _id: 1,
        editing: {
          connectionIds: 1,
        },
      },
      collabText: {
        headText: {
          revision: 1,
        },
        tailText: {
          revision: 1,
        },
      },
    },
  });

  const noteUser = findNoteUser(currentUserId, note);
  if (!noteUser) {
    // TODO move to service
    throw new NoteNotFoundServiceError(input.noteId);
  }

  if (!noteUser.editing?.connectionIds.includes(connectionId)) {
    throw new GraphQLError(
      'Current connection is not in editing mode. ' +
        'Must subscribe to "noteEditorEvents" to use mutation "updateNoteEditorSelectionRange"'
    );
  }

  if (note.collabText) {
    if (note.collabText.headText.revision < input.revision) {
      // TODO refactor error
      throw new Error('INVALID INPUT, input revision is greater than headText.revision');
    } else if (input.revision < note.collabText.tailText.revision) {
      // TODO refactor error
      throw new Error(
        'INVALID INPUT, input revision is less than than tailText.revision'
      );
    }
  }

  const editingCollabText: DBNoteEditingSchema['collabText'] = {
    revision: input.revision,
    latestSelection: SelectionRangeSchema.createRaw({
      start: input.selectionRange.start,
      end: input.selectionRange.end ?? undefined,
    }),
  };

  await mongoDB.collections.noteEditing.updateOne(
    {
      noteId: input.noteId,
      userId: currentUserId,
    },
    {
      $setOnInsert: {
        noteId: input.noteId,
        userId: currentUserId,
      },
      $set: {
        expireAt: new Date(
          Date.now() + (ctx.options?.note?.noteEditingDuration ?? 1000 * 60 * 60)
        ),
        collabText: editingCollabText,
      },
      $addToSet: {
        connectionIds: ctx.connectionId,
      },
    },
    {
      upsert: true,
    }
  );

  const userQuery = mongoDB.loaders.user.createQueryFn({
    userId: currentUserId,
  });
  const noteQuery = mongoDB.loaders.note.createQueryFn({
    noteId: input.noteId,
    userId: currentUserId,
  });

  const payload: ResolversTypes['NoteEditorMutations'] = {
    __typename: 'UpdateNoteEditorSelectionRangePayload',
    textEditState: {
      query: createValueQueryFn<
        NonNullable<NonNullable<QueryableNoteUser['editing']>['collabText']>
      >(() => editingCollabText),
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

  await publishNoteEditorMutation(input.noteId, payload, ctx);

  return payload;
};
