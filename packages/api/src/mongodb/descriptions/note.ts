import { CollectionName, MongoDBCollectionsOnlyNames } from '../collections';
import { DeepAnyDescription } from '../query/description';
import { NoteUserSchema } from '../schema/note-user';
import {
  collabTextDescription,
  collabTextSchemaToQueryable,
  QueryableCollabText,
} from './collab-text';
import { CollabSchema } from '../schema/collab';
import {
  array,
  assign,
  Infer,
  InferRaw,
  object,
  omit,
  optional,
  record,
  string,
} from 'superstruct';
import { UserSchema } from '../schema/user';
import { NoteSchema } from '../schema/note';

export const QueryableNoteUser = assign(
  NoteUserSchema,
  object({
    user: omit(UserSchema, ['notes', 'thirdParty', '_id']),
  })
);

export const QueryableNoteCollab = assign(
  CollabSchema,
  object({
    texts: record(string(), QueryableCollabText),
  })
);

export const QueryableNote = assign(
  NoteSchema,
  object({
    collab: optional(QueryableNoteCollab),
    users: array(QueryableNoteUser),
  })
);

export function noteSchemaToQueryable<
  T extends InferRaw<typeof NoteSchema> | Infer<typeof NoteSchema>,
>(note: T) {
  return {
    ...note,
    collab: {
      ...note.collab,
      texts: note.collab?.texts
        ? Object.fromEntries(
            note.collab.texts.map((text) => {
              return [text.k, collabTextSchemaToQueryable(text.v)];
            })
          )
        : undefined,
    },
  };
}

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
