import { isDefined } from '~utils/type-guards/is-defined';
import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { QueryableUserLoader } from '../../../loaders/queryable-user-loader';
import { DeepAnyDescription } from '../../../query/description';
import { ObjectQueryDeep, QueryResultDeep } from '../../../query/query';
import {
  collabTextDescription,
  QueryableCollabText,
  queryWithCollabTextSchema,
} from '../../collab-text/query/collab-text';
import { UserSchema } from '../../user';
import { NoteCollabSchema, NoteSchema } from '../../note';
import { NoteUserSchema } from '../../note-user';

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

interface QueryWithNoteSchemaParams {
  query: ObjectQueryDeep<QueryableNote>;
  note: NoteSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithNoteSchema({
  query,
  note,
  userLoader,
}: QueryWithNoteSchemaParams): Promise<QueryResultDeep<QueryableNote>> {
  const queryCollab = query.collab;
  const { collab, ...noteNoCollab } = note;
  if (!queryCollab || !collab) {
    return noteNoCollab;
  }

  return {
    ...noteNoCollab,
    collab: await queryWithNoteCollabSchema({
      query: queryCollab,
      collab,
      userLoader,
    }),
  };
}

interface QueryWithNoteCollabSchemaParams {
  query: ObjectQueryDeep<QueryableNoteCollab>;
  collab: NoteCollabSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithNoteCollabSchema({
  query,
  collab,
  userLoader,
}: QueryWithNoteCollabSchemaParams): Promise<QueryResultDeep<QueryableNoteCollab>> {
  const queryTexts = query.texts;
  const { texts, ...collabNoTexts } = collab;
  if (!queryTexts) {
    return collabNoTexts;
  }

  return {
    ...collab,
    texts: Object.fromEntries(
      (
        await Promise.all(
          collab.texts.map(async ({ k, v }) => {
            const queryText = queryTexts[k];
            if (!queryText) return;

            return [
              k,
              await queryWithCollabTextSchema({
                query: queryText,
                collabText: v,
                userLoader,
              }),
            ];
          })
        )
      ).filter(isDefined)
    ),
  };
}

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
