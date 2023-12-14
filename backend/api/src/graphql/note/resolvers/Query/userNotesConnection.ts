import { ObjectId } from 'mongodb';
import { PipelineStage, Require_id, Types } from 'mongoose';

import type { QueryResolvers } from '../../../../graphql/types.generated';
import { DBNote } from '../../../../mongoose/models/note';
import { DBUSerNote } from '../../../../mongoose/models/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';

type UserNoteWithoutIds = Omit<DBUSerNote, 'userId' | 'noteId'>;
type UserNoteWithNote = UserNoteWithoutIds & { note: Require_id<DBNote> };

interface AggregateResult {
  userNotes: Require_id<UserNoteWithNote>[];
  lastId: Types.ObjectId;
}

export const userNotesConnection: NonNullable<
  QueryResolvers['userNotesConnection']
> = async (_parent, { first, after }, ctx) => {
  const {
    auth,
    mongoose: { model },
  } = ctx;
  assertAuthenticated(auth);

  const pipeline: PipelineStage[] = [
    // Select authenticated user
    {
      $match: {
        _id: auth.session.user._id._id,
      },
    },
  ];

  if (!after) {
    // Slice notes [0, first]
    pipeline.push({
      $project: {
        order: {
          $slice: ['$notes.category.default.order', 0, first],
        },
        lastId: {
          $last: '$notes.category.default.order',
        },
      },
    });
  } else {
    // Slice notes [indexOf(after)+1, first]
    pipeline.push({
      $project: {
        order: {
          $let: {
            vars: {
              startIndex: {
                $add: [
                  1,
                  {
                    $indexOfArray: ['$notes.category.default.order', new ObjectId(after)],
                  },
                ],
              },
            },
            in: {
              $slice: ['$notes.category.default.order', '$$startIndex', first],
            },
          },
        },
        lastId: {
          $last: '$notes.category.default.order',
        },
      },
    });
  }

  pipeline.push(
    ...[
      {
        $unwind: {
          path: '$order',
          includeArrayIndex: 'index',
        },
      },
      {
        $lookup: {
          from: model.UserNote.collection.collectionName,
          foreignField: '_id',
          localField: 'order',
          as: 'userNote',
          pipeline: [
            {
              $lookup: {
                from: model.Note.collection.collectionName,
                foreignField: '_id',
                localField: 'noteId',
                as: 'note',
              },
            },
            { $unset: ['userId', 'noteId'] },
            {
              $set: {
                note: { $arrayElemAt: ['$note', 0] },
              },
            },
          ],
        },
      },
      {
        $set: {
          userNote: { $arrayElemAt: ['$userNote', 0] },
        },
      },
      {
        $group: {
          _id: '$_id',
          lastId: { $first: '$lastId' },
          userNotes: { $push: '$userNote' },
        },
      },
      { $unset: ['_id'] },
    ]
  );

  const results = await model.User.aggregate<Require_id<AggregateResult>>(pipeline);

  const result = results[0];
  if (!result) {
    return {
      notes: [],
      edges: [],
      pageInfo: {
        endCursor: null,
        hasNextPage: false,
      },
    };
  }
  const { userNotes, lastId } = result;

  const edges = userNotes.map((userNote) => {
    const { note } = userNote;
    return {
      cursor: String(userNote._id),
      node: {
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
      },
    };
  });

  const endCursorId = userNotes[userNotes.length - 1]?._id;
  const hasNextPage = (endCursorId && !lastId.equals(endCursorId)) ?? false;

  return {
    notes: edges.map((edge) => ({
      ...edge.node,
    })),
    edges,
    pageInfo: {
      endCursor: endCursorId?.toString(),
      hasNextPage,
    },
  };
};
