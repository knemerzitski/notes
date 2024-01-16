import { GraphQLError } from 'graphql';
import { ObjectId } from 'mongodb';
import { PipelineStage, Require_id, Types } from 'mongoose';

import { DBNote } from '../../../../mongoose/models/note';
import { DBUserNote } from '../../../../mongoose/models/user-note';
import { assertAuthenticated } from '../../../base/directives/auth';

import type { InputMaybe, NoteEdge, QueryResolvers } from './../../../types.generated';

type UserNoteWithoutIds = Omit<DBUserNote, 'userId' | 'notePublicId'>;
type UserNoteWithNote = UserNoteWithoutIds & { note?: Require_id<DBNote> };

interface AggregateResult {
  userNotes: Require_id<UserNoteWithNote>[];
  firstId?: Types.ObjectId;
  lastId?: Types.ObjectId;
}

const RESULT_LIMIT_COUNT = 20;

export const notesConnection: NonNullable<QueryResolvers['notesConnection']> = async (
  _parent,
  { first, after, last, before },
  ctx
) => {
  const {
    auth,
    mongoose: { model },
  } = ctx;
  assertAuthenticated(auth);

  // Validate variables
  const forwardsPagination = first != null || after != null;
  const backwardsPagination = last != null || before != null;
  if (forwardsPagination && backwardsPagination) {
    throw new GraphQLError(
      'Cannot mix arguments ("first", "after") with ("last", "before").',
      {
        extensions: {
          code: 'ILLEGAL_ARGUMENTS',
        },
      }
    );
  }
  if (!forwardsPagination && !backwardsPagination) {
    throw new GraphQLError(
      'Must provide at least one variable "first", "after", "last" or "before"',
      {
        extensions: {
          code: 'ILLEGAL_ARGUMENTS',
        },
      }
    );
  }

  const queryingAnyItems = !(first === 0 || last === 0);
  const afterOrBeforeCursor = after ?? before;
  if (!queryingAnyItems && !afterOrBeforeCursor) {
    throw new GraphQLError(
      '"before" or "after" is required to paginate with zero "first" or "last".',
      {
        extensions: {
          code: 'ILLEGAL_ARGUMENTS',
        },
      }
    );
  }

  const currentUserId = ObjectId.createFromBase64(auth.session.user._id);

  const pipelineStages: PipelineStage[] = [
    // Select authenticated user
    {
      $match: {
        _id: currentUserId,
      },
    },
  ];

  if (queryingAnyItems) {
    if (forwardsPagination) {
      pipelineStages.push(
        projectForwardsPagination({ fieldName: 'order', first, after })
      );
    } else {
      pipelineStages.push(
        projectBackwardsPagination({ fieldName: 'order', last, before })
      );
    }
  } else {
    // Select only the cursor to determine availability of next and prev page
    pipelineStages.push({
      $project: {
        order: [new ObjectId(afterOrBeforeCursor ?? '')],
        firstId: {
          $first: '$notes.category.default.order',
        },
        lastId: {
          $last: '$notes.category.default.order',
        },
      },
    });
  }

  pipelineStages.push(
    ...lookupNotes({
      fieldName: 'order',
      userNoteCollectionName: model.UserNote.collection.collectionName,
      noteCollectionName: model.Note.collection.collectionName,
    })
  );

  const results = await model.User.aggregate<Require_id<AggregateResult>>(pipelineStages);

  const result = results[0];
  if (!result) {
    return {
      notes: [],
      edges: [],
      pageInfo: {
        startCursor: null,
        hasPreviousPage: false,
        endCursor: null,
        hasNextPage: false,
      },
    };
  }
  const { userNotes, firstId, lastId } = result;

  const edges = queryingAnyItems
    ? userNotes
        .map((userNote) => {
          const { note } = userNote;
          if (!note) return null;

          return {
            cursor: String(userNote._id),
            node: {
              id: note.publicId,
              title: note.title ?? '',
              textContent: note.textContent ?? '',
              readOnly: userNote.readOnly,
              preferences: {
                backgroundColor: userNote.preferences?.backgroundColor,
              },
            },
          };
        })
        .reduce<NoteEdge[]>((arr, item) => {
          if (item !== null) {
            arr.push(item);
          }
          return arr;
        }, [])
    : [];

  const startCursorId = userNotes[0]?._id;
  const hasPreviousPage = (startCursorId && !firstId?.equals(startCursorId)) ?? false;
  const endCursorId = userNotes[userNotes.length - 1]?._id;
  const hasNextPage = (endCursorId && !lastId?.equals(endCursorId)) ?? false;

  return {
    notes: edges.map((edge) => ({
      ...edge.node,
    })),
    edges,
    pageInfo: {
      hasPreviousPage,
      startCursor: startCursorId?.toString(),
      hasNextPage,
      endCursor: endCursorId?.toString(),
    },
  };
};

/**
 * Last projected stage
 * @example
 * $project: {
 *   order: {...},
 *   firstId: {...},
 *   lastId: {...}
 * }
 */
function projectForwardsPagination({
  fieldName,
  first,
  after,
}: {
  fieldName: string;
  first: InputMaybe<number>;
  after: InputMaybe<string>;
}): PipelineStage {
  first = first != null && first <= RESULT_LIMIT_COUNT ? first : RESULT_LIMIT_COUNT;

  return {
    $project: {
      [fieldName]: {
        ...(!after
          ? {
              // Slice user notes ids [0, first-1]
              $slice: ['$notes.category.default.order', 0, first],
            }
          : {
              // Slice user notes ids [indexOf(after)+1, first-1]
              $let: {
                vars: {
                  startIndex: {
                    $add: [
                      1,
                      {
                        $indexOfArray: [
                          '$notes.category.default.order',
                          new ObjectId(after),
                        ],
                      },
                    ],
                  },
                },
                in: {
                  $slice: ['$notes.category.default.order', '$$startIndex', first],
                },
              },
            }),
      },
      firstId: {
        $first: '$notes.category.default.order',
      },
      lastId: {
        $last: '$notes.category.default.order',
      },
    },
  };
}

/**
 * Last projected stage
 * @example
 * $project: {
 *   order: {...},
 *   firstId: {...},
 *   lastId: {...}
 * }
 */
function projectBackwardsPagination({
  fieldName,
  last,
  before,
}: {
  fieldName: string;
  last: InputMaybe<number>;
  before: InputMaybe<string>;
}): PipelineStage {
  last = last != null && last <= RESULT_LIMIT_COUNT ? last : RESULT_LIMIT_COUNT;

  return {
    $project: {
      [fieldName]: {
        ...(!before
          ? {
              // Slice user notes ids [-last, last]
              $slice: ['$notes.category.default.order', -last, last],
            }
          : {
              // Slice user notes ids [indexOf(before)-last-1, indexOf(before)-1]
              $let: {
                vars: {
                  // startIndex might be negative
                  startIndex: {
                    $subtract: [
                      {
                        $indexOfArray: [
                          '$notes.category.default.order',
                          new ObjectId(before),
                        ],
                      },
                      last,
                    ],
                  },
                },
                in: {
                  $cond: {
                    // ensure slice count will be positive
                    if: { $gt: [{ $add: ['$$startIndex', last] }, 0] },
                    then: {
                      $slice: [
                        '$notes.category.default.order',
                        {
                          $max: ['$$startIndex', 0],
                        },
                        {
                          $add: [
                            {
                              $min: ['$$startIndex', 0],
                            },
                            last,
                          ],
                        },
                      ],
                    },
                    else: [],
                  },
                },
              },
            }),
      },
      firstId: {
        $first: '$notes.category.default.order',
      },
      lastId: {
        $last: '$notes.category.default.order',
      },
    },
  };
}

/**
 * Last projected stage
 * @example
 * $project: {
 *  firstId: {...},
 *  lastId: {...},
 *  userNotes: [...]
 * }
 */
function lookupNotes({
  fieldName,
  userNoteCollectionName,
  noteCollectionName,
}: {
  fieldName: string;
  userNoteCollectionName: string;
  noteCollectionName: string;
}): PipelineStage[] {
  return [
    {
      $unwind: {
        path: `$${fieldName}`,
        includeArrayIndex: 'index',
      },
    },
    {
      $lookup: {
        from: userNoteCollectionName,
        foreignField: '_id',
        localField: fieldName,
        as: 'userNote',
        pipeline: [
          {
            $lookup: {
              from: noteCollectionName,
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
        firstId: { $first: '$firstId' },
        lastId: { $first: '$lastId' },
        userNotes: { $push: '$userNote' },
      },
    },
    { $unset: ['_id'] },
  ];
}
