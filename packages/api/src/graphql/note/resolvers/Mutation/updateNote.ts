import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import {
  MultiFieldDocumentServerError,
  MultiFieldDocumentServerErrorCode,
} from '~collab/adapters/mongodb/multi-field-document-server';

import { createDocumentServer } from '../../../../mongoose/models/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import type {
  CollaborativeDocumentPatch,
  Maybe,
  MutationResolvers,
  UpdateNotePayload,
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

  const currentUserId = ObjectId.createFromBase64(auth.session.user._id);

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
  let titleResult: Maybe<CollaborativeDocumentPatch>;
  let contentResult: Maybe<CollaborativeDocumentPatch>;
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

    if (patch.title != null) {
      documentServer.queueChange('title', {
        revision: patch.title.targetRevision,
        changeset: patch.title.changeset,
      });
    }

    if (patch.content != null) {
      documentServer.queueChange('content', {
        revision: patch.content.targetRevision,
        changeset: patch.content.changeset,
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
        titleResult = noteResult.title?.[0];
        contentResult = noteResult.content?.[0];
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
      title: titleResult,
      content: contentResult,
      preferences: {
        backgroundColor: backgroundColorResult,
      },
    },
  };

  await publishNoteUpdated(ctx, {
    id: updatedNotePayload.id,
    patch: {
      title: updatedNotePayload.patch?.title,
      content: updatedNotePayload.patch?.content,
      preferences: {
        backgroundColor: updatedNotePayload.patch?.preferences?.backgroundColor,
      },
    },
  });

  return updatedNotePayload;
};
