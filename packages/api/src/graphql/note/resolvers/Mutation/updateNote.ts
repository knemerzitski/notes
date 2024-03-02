import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';
import { Require_id, UpdateQuery } from 'mongoose';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import { Changeset } from '~op-transform/changeset/changeset';

import { DBRevisionRecord } from '../../../../mongoose/models/collaborative-document/revision-record';
import { DBNote } from '../../../../mongoose/models/note';
import { assertAuthenticated } from '../../../base/directives/auth';
import type {
  CollaborativeDocumentPatch,
  Maybe,
  MutationResolvers,
  UpdateNotePayload,
} from '../../../types.generated';
import { publishNoteUpdated } from '../Subscription/noteUpdated';

type NoteWithRelevantRecords = Require_id<
  Omit<DBNote, 'content'> & {
    content: Omit<DBNote['content'], 'records'> & {
      relevantRecords?: {
        revision: DBRevisionRecord['revision'];
        changeset: unknown;
      }[];
    };
  }
>;

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
      backgroundColorResult = patch.preferences.backgroundColor;
    }

    // TODO collaborative document module
    let contentUpdateQuery: UpdateQuery<DBNote> | undefined;
    if (patch.content != null) {
      // Get note info required to add next record
      const noteAggregate = await model.Note.aggregate<NoteWithRelevantRecords>([
        {
          $match: {
            publicId: notePublicId,
          },
        },
        {
          $project: {
            publicId: 1, // TODO not relevant
            ownerId: 1, // TODO not relevant
            title: 1, // TODO not relevant
            content: {
              latestRevision: 1,
              latestText: 1,
              relevantRecords: {
                $slice: [
                  '$content.records',
                  {
                    $min: [
                      0,
                      {
                        $subtract: [
                          patch.content.targetRevision, // 427
                          '$content.latestRevision', // 428
                          // should return [428], anything after 427
                        ],
                        // 427 - 428 = -1, min(0,-1) => -1
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      ]);
      const note = noteAggregate[0];
      if (!note) {
        throw new GraphQLError('Note not found.', {
          extensions: {
            code: GraphQLErrorCode.NotFound,
          },
        });
      }

      const latestRevision = note.content.latestRevision;
      const clientTargetRevision = patch.content.targetRevision;

      // 0 <= clientTargetRevision <= latestRevision
      if (latestRevision < clientTargetRevision) {
        throw new GraphQLError(
          `Expected targetRevision to be less or equal to latest revision '${latestRevision}'`,
          {
            extensions: {
              code: GraphQLErrorCode.InvalidInput,
            },
          }
        );
      }

      const clientChangeset = patch.content.changeset;
      let updatedClientChangeset = clientChangeset;
      const relevantRecords = note.content.relevantRecords;
      if (relevantRecords) {
        let expectedRevision = clientTargetRevision + 1;

        for (const rawRecord of relevantRecords) {
          if (expectedRevision !== rawRecord.revision) {
            throw new GraphQLError(
              `Expected revision record '${expectedRevision}' is missing.`,
              {
                extensions: {
                  code: GraphQLErrorCode.InternalError,
                },
              }
            );
          }
          const recordChangeset = Changeset.parseValue(rawRecord.changeset);
          updatedClientChangeset = recordChangeset.follow(updatedClientChangeset);
          expectedRevision++;
        }
      }

      const newestRecord: DBRevisionRecord = {
        revision: latestRevision + 1,
        changeset: updatedClientChangeset, // TODO send this as response
      };
      const newLatestText = Changeset.fromInsertion(note.content.latestText)
        .compose(newestRecord.changeset)
        .joinInsertions();

      contentUpdateQuery = {
        $set: {
          'content.latestRevision': newestRecord.revision,
          'content.latestText': newLatestText,
          'content.sourceConnectionId': ctx.request.headers['x-ws-connection-id'],
        },
        $push: {
          'content.records': newestRecord,
        },
      };

      contentResult = {
        revision: newestRecord.revision,
        changeset: newestRecord.changeset,
      };
    }

    let titleUpdateQuery: UpdateQuery<DBNote> | undefined;
    if (patch.title != null) {
      titleUpdateQuery = {
        $set: {
          title: patch.title,
        },
      };

      titleResult = patch.title;
    }

    if (contentUpdateQuery != null || titleUpdateQuery != null) {
      updatePromises.push(
        model.Note.updateOne(
          {
            publicId: userNote.notePublicId,
          },
          {
            ...titleUpdateQuery,
            ...contentUpdateQuery,
            $set: {
              ...titleUpdateQuery?.$set,
              ...contentUpdateQuery?.$set,
            },
            $push: {
              ...titleUpdateQuery?.$push,
              ...contentUpdateQuery?.$push,
            },
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
