import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { DescriptionDeep } from '../../../query/description';
import { NoteUserSchema } from '../../../schema/note-user';
import { collabTextDescription, QueryableCollabText } from './collab-text';
import { array, assign, Infer, InferRaw, object, omit, optional } from 'superstruct';
import { UserSchema } from '../../../schema/user';
import { NoteSchema } from '../../../schema/note';
import { OpenNoteSchema } from '../../../schema/open-note';

export const QueryableNoteUser = assign(
  NoteUserSchema,
  object({
    user: omit(UserSchema, ['note', 'thirdParty', '_id']),
    openNote: optional(omit(OpenNoteSchema, ['userId', 'noteId'])),
  })
);

export type QueryableNoteUser = Infer<typeof QueryableNoteUser>;

export const QueryableNote = assign(
  NoteSchema,
  object({
    collabText: optional(QueryableCollabText),
    users: array(QueryableNoteUser),
  })
);

export type QueryableNote = Infer<typeof QueryableNote>;

export interface QueryableNoteContext {
  collections: Pick<
    MongoDBCollectionsOnlyNames,
    CollectionName.NOTES | CollectionName.USERS | CollectionName.OPEN_NOTES
  >;
}

export const queryableNoteDescription: DescriptionDeep<
  InferRaw<typeof QueryableNote>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  QueryableNoteContext
> = {
  collabText: collabTextDescription,
  users: {
    // Lookup UserSchema: Note.users._id = UserSchema._id
    user: {
      $addStages({ customContext, subStages, subLastProject }) {
        return [
          {
            $lookup: {
              from: customContext.collections.users.collectionName,
              foreignField: '_id',
              localField: 'users._id',
              as: '_users_user',
              pipeline: [
                ...subStages(),
                {
                  $project: {
                    ...(subLastProject() ?? {}),
                    _id: 1,
                  },
                },
              ],
            },
          },
          {
            $set: {
              users: {
                $map: {
                  input: '$users',
                  in: {
                    $mergeObjects: [
                      '$$this',
                      {
                        $let: {
                          vars: {
                            index: {
                              $indexOfArray: ['$_users_user._id', '$$this._id'],
                            },
                          },
                          in: {
                            $cond: [
                              { $gte: ['$$index', 0] },
                              {
                                user: {
                                  $arrayElemAt: ['$_users_user', '$$index'],
                                },
                              },
                              null,
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ];
      },
    },
    // Lookup OpenNoteSchema: Note.users._id = OpenNoteSchema.userId and Note._id = OpenNoteSchema.noteId
    openNote: {
      $addStages({ customContext, subStages, subLastProject }) {
        return [
          {
            $lookup: {
              from: customContext.collections.openNotes.collectionName,
              let: {
                userId: '$users._id',
                noteId: '$_id',
              },
              as: '_users_openNote',
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$noteId', '$$noteId'] },
                        { $in: ['$userId', '$$userId'] },
                      ],
                    },
                  },
                },
                ...subStages(),
                {
                  $project: {
                    ...(subLastProject() ?? {}),
                    userId: 1,
                  },
                },
              ],
            },
          },
          {
            $set: {
              users: {
                $map: {
                  input: '$users',
                  in: {
                    $mergeObjects: [
                      '$$this',
                      {
                        $let: {
                          vars: {
                            index: {
                              $indexOfArray: ['$_users_openNote.userId', '$$this._id'],
                            },
                          },
                          in: {
                            $cond: [
                              { $gte: ['$$index', 0] },
                              {
                                openNote: {
                                  $arrayElemAt: ['$_users_openNote', '$$index'],
                                },
                              },
                              null,
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ];
      },
    },
  },
  $mapLastProject({ projectValue }) {
    return {
      _id: projectValue._id ?? 0,
    };
  },
};
