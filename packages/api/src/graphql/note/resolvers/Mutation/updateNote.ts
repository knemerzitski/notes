import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';
import { UpdateQuery } from 'mongoose';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import {
  MultiFieldDocumentServer,
  MultiFieldDocumentServerError,
  MultiFieldDocumentServerErrorCode,
} from '~collab/adapters/mongodb/multi-field-document-server';

import { DBNote } from '../../../../mongoose/models/note';
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
  let titleResult: Maybe<string>;
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

    const collabDocumentServer = new MultiFieldDocumentServer<'content'>(
      model.Note.collection
    );

    let titleUpdateQuery: UpdateQuery<DBNote> | undefined;
    if (patch.title != null) {
      titleUpdateQuery = {
        $set: {
          title: patch.title,
        },
      };

      titleResult = patch.title;
    }

    if (patch.content != null) {
      collabDocumentServer.queueChange('content', {
        revision: patch.content.targetRevision,
        changeset: patch.content.changeset,
      });
    }

    let notePromise:
      | ReturnType<typeof collabDocumentServer.updateOneWithSession>
      | undefined;
    if (patch.content != null || titleUpdateQuery != null) {
      notePromise = collabDocumentServer.updateOneWithSession(
        session,
        {
          publicId: notePublicId,
        },
        {
          $set: {
            ...titleUpdateQuery,
          },
        }
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, noteResult] = await Promise.all([userNotePromise, notePromise]);
      if (noteResult) {
        contentResult = noteResult.content[0];
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
      // TODO collaborative document module
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
