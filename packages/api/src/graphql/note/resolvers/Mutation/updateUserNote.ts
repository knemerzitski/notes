import { GraphQLError } from 'graphql';

import type { MutationResolvers } from '../../../../graphql/types.generated';
import { assertAuthenticated } from '../../../base/directives/auth';

export const updateUserNote: NonNullable<MutationResolvers['updateUserNote']> = async (
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
        note: {
          id: notePublicId,
          title: note.title ?? '',
          textContent: note.textContent ?? '',
        },
        preferences: {
          backgroundColor: userNote.preferences?.backgroundColor,
        },
      },
    };
  }

  if (patch.note && userNote.readOnly) {
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

    if (patch.note) {
      updatePromises.push(
        model.Note.updateOne(
          {
            _id: note._id,
          },
          {
            title: patch.note.title,
            textContent: patch.note.textContent,
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
      note: {
        id: notePublicId,
        title: patch.note?.title ?? note.title ?? '',
        textContent: patch.note?.textContent ?? note.textContent ?? '',
      },
      preferences: {
        backgroundColor:
          patch.preferences?.backgroundColor ?? userNote.preferences?.backgroundColor,
      },
    },
  };
};
