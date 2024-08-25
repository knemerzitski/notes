import { CollectionName, MongoDBCollectionsOnlyNames } from '../collections';
import { DeepAnyDescription } from '../query/description';
import { UserSchema } from '../schema/user';
import { NoteCollabSchema, NoteSchema } from '../schema/note';
import { NoteUserSchema } from '../schema/note-user';
import { collabTextDescription, QueryableCollabText } from './collab-text';

export type QueryableNote = Omit<NoteSchema, 'collab' | 'users'> & {
  collab: QueryableNoteCollab;
  users?: QueryableNoteUser[];
};

export type QueryableNoteUser = NoteUserSchema & {
  user: Omit<UserSchema, 'notes' | 'thirdParty' | '_id'>;
};

export type QueryableNoteCollab = Omit<NoteCollabSchema, 'texts'> & {
  texts: Record<NoteCollabSchema['texts'][0]['k'], QueryableCollabText>;
};

export interface QueryableNoteContext {
  collections: Pick<
    MongoDBCollectionsOnlyNames,
    CollectionName.NOTES | CollectionName.USERS
  >;
}

export const queryableNoteDescription: DeepAnyDescription<
  QueryableNote,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  QueryableNoteContext
> = {
  collab: {
    //@ts-expect-error ignore
    texts: {
      $addStages({ fields }) {
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
