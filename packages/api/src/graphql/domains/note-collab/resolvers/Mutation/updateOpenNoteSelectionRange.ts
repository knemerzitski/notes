import { GraphQLError } from 'graphql';
import { createValueQueryFn } from '../../../../../mongodb/query/query';
import { DBOpenNoteSchema } from '../../../../../mongodb/schema/open-note';
import { assertAuthenticated } from '../../../../../services/auth/assert-authenticated';
import { findNoteUser } from '../../../../../services/note/note';
import {
  CollabText_id_fromNoteQueryFn,
  mapNoteToCollabTextQueryFn,
} from '../../../../../services/note/note-collab';
import type { MutationResolvers, ResolversTypes } from '../../../types.generated';
import { publishOpenNoteMutation } from '../Subscription/openNoteEvents';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { CustomHeaderName } from '~api-app-shared/custom-headers';
import { NoteNotFoundServiceError } from '../../../../../services/note/errors';
import { QueryableNoteUser } from '../../../../../mongodb/loaders/note/descriptions/note';
import { SelectionRangeSchema } from '../../../../../mongodb/schema/collab-text';

export const updateOpenNoteSelectionRange: NonNullable<
  MutationResolvers['updateOpenNoteSelectionRange']
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
        openNote: {
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

  if (!noteUser.openNote?.connectionIds.includes(connectionId)) {
    throw new GraphQLError(
      'Current connection has not opened the note.' +
        'Must subscribe to "openNoteEvents" to use mutation "updateOpenNoteSelectionRange"'
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

  const openCollabText: DBOpenNoteSchema['collabText'] = {
    revision: input.revision,
    latestSelection: SelectionRangeSchema.createRaw({
      start: input.selectionRange.start,
      end: input.selectionRange.end ?? undefined,
    }),
  };

  await mongoDB.collections.openNotes.updateOne(
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
          Date.now() + (ctx.options?.note?.openNoteDuration ?? 1000 * 60 * 60)
        ),
        collabText: openCollabText,
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

  const payload: ResolversTypes['OpenNoteMutations'] = {
    __typename: 'UpdateOpenNoteSelectionRangePayload',
    collabTextState: {
      query: createValueQueryFn<
        NonNullable<NonNullable<QueryableNoteUser['openNote']>['collabText']>
      >(() => openCollabText),
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
