import { GraphQLError } from 'graphql';
import { Require_id, Types } from 'mongoose';

import type { QueryResolvers } from '../../../../graphql/types.generated';
import { DBNote } from '../../../../mongoose/models/note';
import { DBUserNote } from '../../../../mongoose/models/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';

type UserNoteWithoutIds = Omit<DBUserNote, 'userId' | 'notePublicId'> & {
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

  const results = await model.UserNote.aggregate<AggregateResult>([
    {
      $match: {
        userId: auth.session.user._id._id,
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
