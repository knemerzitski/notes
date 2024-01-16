import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { assertAuthenticated } from '../../../base/directives/auth';
import { publishNoteUpdated } from '../Subscription/noteUpdated';

import type { MutationResolvers, UpdateNotePayload } from './../../../types.generated';

export const updateNote: NonNullable<MutationResolvers['updateNote']> = async (
  _parent,
  { input: { id: notePublicId, patch } },
  ctx
) => {
  const {
    auth,
    mongoose: { model, connection },
  } = ctx;
  assertAuthenticated(auth);

  const currentUserId = ObjectId.createFromBase64(auth.session.user._id);

  const [userNote, note] = await Promise.all([
    model.UserNote.findOne({
      userId: currentUserId,
      notePublicId,
    }).lean(),
    model.Note.findOne({
      publicId: notePublicId,
    }).lean(),
  ]);

  if (!userNote || !note) {
    throw new GraphQLError('Note not found.', {
      extensions: {
        code: 'NOT_FOUND',
      },
    });
  }

  if (!patch) {
    return {
      note: {
        id: notePublicId,
        title: note.title ?? '',
        textContent: note.textContent ?? '',
        preferences: {
          backgroundColor: userNote.preferences?.backgroundColor,
        },
      },
    };
  }

  if (userNote.readOnly) {
    throw new GraphQLError('Note is read-only and cannot be modified.', {
      extensions: {
        code: 'READONLY',
      },
    });
  }

  await connection.transaction(async (session) => {
    const updatePromises = [];
    if (patch.preferences) {
      updatePromises.push(
        model.UserNote.updateOne(
          {
            _id: userNote._id,
          },
          {
            preferences: {
              backgroundColor: patch.preferences.backgroundColor,
            },
          },
          {
            session,
          }
        )
      );
    }

    if (patch.title != null || patch.textContent != null) {
      updatePromises.push(
        model.Note.updateOne(
          {
            _id: note._id,
          },
          {
            title: patch.title,
            textContent: patch.textContent,
          },
          {
            session,
          }
        )
      );
    }

    await Promise.all(updatePromises);
  });

  const updatedNotePayload: UpdateNotePayload = {
    note: {
      id: notePublicId,
      title: patch.title ?? note.title ?? '',
      textContent: patch.textContent ?? note.textContent ?? '',
      preferences: {
        backgroundColor:
          patch.preferences?.backgroundColor ?? userNote.preferences?.backgroundColor,
      },
    },
  };

  await publishNoteUpdated(ctx, {
    id: updatedNotePayload.note.id,
    patch: {
      title: updatedNotePayload.note.title,
      textContent: updatedNotePayload.note.textContent,
      preferences: {
        backgroundColor: updatedNotePayload.note.preferences.backgroundColor,
      },
    },
  });

  return updatedNotePayload;
};
