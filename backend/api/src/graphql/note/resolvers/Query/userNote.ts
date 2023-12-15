import { GraphQLError } from 'graphql';
import { Require_id, Types } from 'mongoose';

import type { QueryResolvers } from '../../../../graphql/types.generated';
import { DBNote } from '../../../../mongoose/models/note';
import { DBUserNote } from '../../../../mongoose/models/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';

type UserNoteWithoutIds = Omit<DBUserNote, 'userId' | 'noteId'> & {
  _id?: Types.ObjectId;
};
type UserNoteWithNote = UserNoteWithoutIds & { note: Require_id<DBNote> };

type AggregateResult = UserNoteWithNote;

export const userNote: NonNullable<QueryResolvers['userNote']> = async (
  _parent,
  { id: notePublicId },
  ctx
) => {
  const {
    auth,
    mongoose: { model },
  } = ctx;
  assertAuthenticated(auth);

  const results = await model.Note.aggregate<AggregateResult>([
    {
      $match: {
        publicId: notePublicId,
      },
    },
    {
      $project: { note: '$$ROOT' },
    },
    {
      $lookup: {
        // all UserNotes that have notePublicId
        from: model.UserNote.collection.collectionName,
        foreignField: 'noteId',
        localField: '_id',
        as: 'userNote',

        pipeline: [
          {
            // Ensure current user has access to notePublicId
            $match: {
              userId: auth.session.user._id._id,
            },
          },
          { $unset: ['userId', 'noteId'] },
        ],
      },
    },
    {
      $set: {
        userNote: { $arrayElemAt: ['$userNote', 0] },
      },
    },
    {
      $addFields: {
        'userNote.note': '$note',
      },
    },
    {
      $replaceRoot: {
        newRoot: '$userNote',
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
    readOnly: userNote.readOnly,
    preferences: {
      backgroundColor: userNote.preferences?.backgroundColor,
    },
    note: {
      id: note.publicId,
      title: note.title ?? '',
      textContent: note.textContent ?? '',
    },
  };
};
