import { GraphQLError } from 'graphql';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import {
  MultiFieldDocumentServerError,
  MultiFieldDocumentServerErrorCode,
} from '~collab/adapters/mongodb/multi-field-document-server';

// import { createDocumentServer } from '../../../../mongodb/schema/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import {
  NoteTextField,
  type Maybe,
  type MutationResolvers,
  type UpdateNotePayload,
  NoteTextFieldEntryPatch,
} from '../../../types.generated';
import { publishNoteUpdated } from '../Subscription/noteUpdated';

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

  const currentUserId = auth.session.user._id._id;

  const userNote = await model.UserNote.findOne({
    userId: currentUserId,
    notePublicId,
  }).lean();

  if (!userNote) {
    throw new GraphQLError('Note not found.', {
      extensions: {
        code: GraphQLErrorCode.NotFound,
      },
    });
  }

  if (!patch) {
    return {
      id: notePublicId,
    };
  }

  if (userNote.readOnly) {
    throw new GraphQLError('Note is read-only and cannot be modified.', {
      extensions: {
        code: GraphQLErrorCode.ReadOnly,
      },
    });
  }

  let backgroundColorResult: Maybe<string>;
  let textFieldsResult: Maybe<NoteTextFieldEntryPatch[]>;
  await connection.transaction(async (session) => {
    let userNotePromise: ReturnType<typeof model.UserNote.updateOne> | undefined;
    if (patch.preferences) {
      userNotePromise = model.UserNote.updateOne(
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
      );
      backgroundColorResult = patch.preferences.backgroundColor;
    }

    const documentServer = createDocumentServer(model.Note);

    if (patch.textFields) {
      patch.textFields.some(({ key, value }) => {
        if (key === NoteTextField.TITLE) {
          documentServer.queueChange('title', {
            revision: value.targetRevision,
            changeset: value.changeset,
          });
          return true;
        }
        return false;
      });

      patch.textFields.some(({ key, value }) => {
        if (key === NoteTextField.CONTENT) {
          documentServer.queueChange('content', {
            revision: value.targetRevision,
            changeset: value.changeset,
          });
          return true;
        }
        return false;
      });
    }

    let notePromise: ReturnType<typeof documentServer.updateOneWithSession> | undefined;
    if (documentServer.hasChanges()) {
      notePromise = documentServer.updateOneWithSession(session, {
        publicId: notePublicId,
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, noteResult] = await Promise.all([userNotePromise, notePromise]);
      if (noteResult) {
        textFieldsResult = [];

        const titleResult = noteResult.title?.[0];
        if (titleResult) {
          textFieldsResult.push({
            key: NoteTextField.TITLE,
            value: titleResult,
          });
        }

        const contentResult = noteResult.content?.[0];
        if (contentResult) {
          textFieldsResult.push({
            key: NoteTextField.CONTENT,
            value: contentResult,
          });
        }
      }
    } catch (err) {
      if (err instanceof MultiFieldDocumentServerError) {
        if (err.code === MultiFieldDocumentServerErrorCode.DocumentNotFound) {
          throw new GraphQLError('Note not found.', {
            extensions: {
              code: GraphQLErrorCode.NotFound,
            },
          });
        } else {
          throw new GraphQLError('Required record was not found.', {
            extensions: {
              code: GraphQLErrorCode.InvalidInput,
            },
          });
        }
      } else {
        throw err;
      }
    }
  });

  const updatedNotePayload: UpdateNotePayload = {
    id: notePublicId,
    patch: {
      textFields: textFieldsResult,
      preferences: {
        backgroundColor: backgroundColorResult,
      },
    },
  };

  await publishNoteUpdated(ctx, {
    id: updatedNotePayload.id,
    patch: {
      textFields: updatedNotePayload.patch?.textFields,
      preferences: {
        backgroundColor: updatedNotePayload.patch?.preferences?.backgroundColor,
      },
    },
  });

  return updatedNotePayload;
};
