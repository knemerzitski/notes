import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';
import { Require_id, Types } from 'mongoose';

import { DBCollaborativeDocument } from '../../../../mongoose/models/collaborative-document/collaborative-document';
import { DBNote } from '../../../../mongoose/models/note';
import { DBUserNote } from '../../../../mongoose/models/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';

import type { QueryResolvers } from './../../../types.generated';

type UserNoteWithoutIds = Omit<DBUserNote, 'userId' | 'notePublicId'> & {
  _id?: Types.ObjectId;
};
type NoteWithoutRecords = Omit<DBNote, 'content'> & {
  content: Omit<DBCollaborativeDocument, 'records'>;
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

  const currentUserId = ObjectId.createFromBase64(auth.session.user._id);

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
        code: 'NOT_FOUND',
      },
    });
  }

  if (!userNote._id) {
    throw new GraphQLError('You are not authorized to access this note.', {
      extensions: {
        code: 'UNAUTHORIZED',
      },
    });
  }

  const { note } = userNote;

  return {
    id: note.publicId,
    title: note.title ?? '',
    // TODO collaborative document module
    content: {
      revision: note.content.latestRevision,
      text: note.content.latestText,
    },
    readOnly: userNote.readOnly,
    preferences: {
      backgroundColor: userNote.preferences?.backgroundColor,
    },
  };
};
