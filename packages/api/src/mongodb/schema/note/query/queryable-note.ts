import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { DeepAnyDescription } from '../../../query/description';
import { AddStagesResolver } from '../../../query/merged-query-to-pipeline';
import { CollabTextSchema } from '../../collab-text/collab-text';
import { collabTextDescription } from '../../collab-text/query/collab-text';
import { UserSchema } from '../../user/user';
import { NoteSchema } from '../note';
import { NoteUserSchema } from '../note-user';

export type QueryableNote = Omit<NoteSchema, 'collabTexts' | 'users'> & {
  collabTexts?: Record<
    NonNullable<NoteSchema['collabTexts']>[0]['k'],
    NonNullable<NoteSchema['collabTexts']>[0]['v']
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

export const queryableNoteDescription: DeepAnyDescription<QueryableNote> = {
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
      $addStages({
        customContext,
        subStages,
        subLastProject,
      }: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customContext: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subStages: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subLastProject: any;
      }) {
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
  $mapLastProject(query) {
    return {
      _id: query._id ?? 0,
    };
  },
};
