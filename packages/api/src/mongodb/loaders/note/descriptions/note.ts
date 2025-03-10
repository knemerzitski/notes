import { array, assign, Infer, InferRaw, object, omit, optional } from 'superstruct';

import { CollectionName } from '../../../collection-names';
import { MongoDBCollectionsOnlyNames } from '../../../collections';
import { DescriptionDeep } from '../../../query/description';
import { NoteSchema } from '../../../schema/note';
import { NoteUserSchema } from '../../../schema/note-user';

import { OpenNoteSchema } from '../../../schema/open-note';
import { UserSchema } from '../../../schema/user';

import { collabTextDescription, QueryableCollabText } from './collab-text';

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
    | CollectionName.NOTES
    | CollectionName.USERS
    | CollectionName.OPEN_NOTES
    | CollectionName.COLLAB_RECORDS
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
      $addStages({ customContext, subStages, subLastProject, fields }) {
        const parentRelativePath = fields.map((field) => field.parentRelativePath)[0];
        if (!parentRelativePath) {
          return;
        }

        return [
          {
            $lookup: {
              from: customContext.collections.users.collectionName,
              foreignField: '_id',
              localField: `${parentRelativePath}._id`,
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
              [parentRelativePath]: {
                $map: {
                  input: `$${parentRelativePath}`,
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
      $addStages({ customContext, subStages, subLastProject, fields }) {
        const parentRelativePath = fields.map((field) => field.parentRelativePath)[0];
        if (!parentRelativePath) {
          return;
        }

        return [
          {
            $lookup: {
              from: customContext.collections.openNotes.collectionName,
              let: {
                userId: `$${parentRelativePath}._id`,
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
              [parentRelativePath]: {
                $map: {
                  input: `$${parentRelativePath}`,
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
