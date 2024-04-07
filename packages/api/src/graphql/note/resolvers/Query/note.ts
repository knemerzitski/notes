import { GraphQLError } from 'graphql';
import { Require_id, Types } from 'mongoose';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { DBCollabText } from '../../../../mongoose/models/collab/collab-text';
import { DBNote } from '../../../../mongoose/models/note';
import { DBUserNote } from '../../../../mongoose/models/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';

import { NoteTextField, type QueryResolvers } from './../../../types.generated';
import { Changeset } from '~collab/changeset/changeset';

type UserNoteWithoutIds = Omit<DBUserNote, 'userId' | 'notePublicId'> & {
  _id?: Types.ObjectId;
};
type NoteWithoutRecords<T = unknown> = Omit<DBNote<T>, 'content'> & {
  content: Omit<DBCollabText<T>, 'records'>;
};
type UserNoteWithNote = UserNoteWithoutIds & { note: Require_id<NoteWithoutRecords> };

type AggregateResult = UserNoteWithNote;

export const note: NonNullable<QueryResolvers['note']> = async (
  _parent,
  { id: notePublicId },
  ctx
) => {
  const {
    auth,
    mongoose: { model },
  } = ctx;
  assertAuthenticated(auth);

  const currentUserId = auth.session.user._id._id;

  const results = await model.UserNote.aggregate<AggregateResult>([
    {
      $match: {
        userId: currentUserId,
        notePublicId: notePublicId,
      },
    },
    {
      // Lookup Note by notePublicId
      $lookup: {
        from: model.Note.collection.collectionName,
        foreignField: 'publicId',
        localField: 'notePublicId',
        as: 'note',
        pipeline: [
          {
            $unset: ['content.records'],
          },
        ],
      },
    },
    { $unset: ['userId', 'notePublicId'] },
    {
      $set: {
        note: { $arrayElemAt: ['$note', 0] },
      },
    },
  ]);

  const userNote = results[0];

  if (!userNote) {
    throw new GraphQLError('Note not found', {
      extensions: {
        code: GraphQLErrorCode.NotFound,
      },
    });
  }

  if (!userNote._id) {
    throw new GraphQLError('You are not authorized to access this note.', {
      extensions: {
        code: GraphQLErrorCode.Unauthorized,
      },
    });
  }

  const { note } = userNote;

  return {
    // TODO userNote id is unique...
    // for window.location send
    // id: userNote._id.toString()
    // publicId: note.publicId
    id: note.publicId,
    textFields: [
      {
        key: NoteTextField.TITLE,
        value: {
          headDocument: {
            revision: note.title.headDocument.revision,
            changeset: Changeset.parseValue(note.title.headDocument.changeset),
          },
        },
      },
      {
        key: NoteTextField.CONTENT,
        value: {
          headDocument: {
            revision: note.content.headDocument.revision,
            changeset: Changeset.parseValue(note.content.headDocument.changeset),
          },
          async recordsConnection(first, afterRevision, last, beforeRevision) {
            const result = await model.Note.aggregate<
              Require_id<{ records: DBNote['content']['records'] }>
            >([
              {
                $match: note._id,
              },
              {
                $project: {
                  records: '$content.records',
                },
              },
            ]);

            const contentRecords = result[0]?.content.records;
            if (!contentRecords) return null;

            return {
              baseText: baseValue.joinInsertions(),
            };
          },
        },
      },
    ],
    readOnly: userNote.readOnly,
    preferences: {
      backgroundColor: userNote.preferences?.backgroundColor,
    },
  };
};
