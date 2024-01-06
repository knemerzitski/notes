import { GraphQLError } from 'graphql';

import { assertAuthenticated } from '../../../base/directives/auth';

import type { MutationResolvers } from './../../../types.generated';

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

  const [userNote, note] = await Promise.all([
    model.UserNote.findOne({
      userId: auth.session.user._id._id,
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

  return {
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
};
