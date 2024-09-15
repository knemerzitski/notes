import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { DeepAnyDescription } from '../../../query/description';
import { NoteUserSchema } from '../../../schema/note-user';
import { collabTextDescription, QueryableCollabText } from './collab-text';
import { array, assign, Infer, InferRaw, object, omit, optional } from 'superstruct';
import { UserSchema } from '../../../schema/user';
import { NoteSchema } from '../../../schema/note';

export const QueryableNoteUser = assign(
  NoteUserSchema,
  object({
    user: omit(UserSchema, ['notes', 'thirdParty', '_id']),
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
    CollectionName.NOTES | CollectionName.USERS
  >;
}

export const queryableNoteDescription: DeepAnyDescription<
  InferRaw<typeof QueryableNote>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  QueryableNoteContext
> = {
  collabText: collabTextDescription,
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
