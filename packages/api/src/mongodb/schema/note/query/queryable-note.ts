import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { DeepAnyDescription } from '../../../query/description';
import { AddStagesResolver } from '../../../query/merged-query-to-pipeline';
import { CollabTextSchema } from '../../collab-text/collab-text';
import {
  collabTextDescription,
  QueryableCollabTextSchema,
} from '../../collab-text/query/collab-text';
import { UserSchema } from '../../user/user';
import { NoteSchema } from '../note';
import { NoteUserSchema } from '../note-user';

export type QueryableNote = Omit<NoteSchema, 'collabTexts' | 'users'> & {
  collabTexts?: Record<
    NonNullable<NoteSchema['collabTexts']>[0]['k'],
    QueryableCollabTextSchema
  >;
  users?: (NoteUserSchema & {
    user: Omit<UserSchema, 'notes' | 'thirdParty' | '_id'>;
  })[];
};

export interface QueryableNoteContext {
  collections: Pick<
    MongoDBCollectionsOnlyNames,
    CollectionName.NOTES | CollectionName.USERS
  >;
}

export const queryableNoteDescription: DeepAnyDescription<
  QueryableNote,
  unknown,
  QueryableNoteContext
> = {
  collabTexts: {
    $addStages({
      fields,
    }: Parameters<AddStagesResolver<Record<string, CollabTextSchema>>>[0]) {
      // collabTexts array into object
      return [
        {
          $set: Object.fromEntries(
            fields.map(({ relativePath }) => [
              relativePath,
              {
                $arrayToObject: `$${relativePath}`,
              },
            ])
          ),
        },
      ];
    },
    $anyKey: collabTextDescription,
  },
  users: {
    // Lookup UserSchema by Note.users._id
    user: {
      $addStages({ customContext, subStages, subLastProject }) {
        return [
          {
            $lookup: {
              from: customContext.collections.users.collectionName,
              foreignField: '_id',
              localField: 'users._id',
              as: '_users',
              pipeline: [
                ...subStages(),
                {
                  $project: subLastProject(),
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
                        user: {
                          $arrayElemAt: [
                            '$_users',
                            {
                              $indexOfArray: ['$_users._id', '$$this._id'],
                            },
                          ],
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
