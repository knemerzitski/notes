import mapObject from 'map-obj';

import { ObjectId } from 'mongodb';

import { isEmptyDeep } from '~utils/object/is-empty-deep';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { isDefined } from '~utils/type-guards/is-defined';
import { MongoDBCollectionsOnlyNames, CollectionName } from '../../collections';
import {
  RelayPagination,
  relayArrayPagination,
  relayMultiArrayConcat,
  relayMultiArraySplit,
  isRelayArrayPaginationAggregateResult,
  relayArrayPaginationMapAggregateResult,
} from '../../pagination/relay-array-pagination';
import { DeepAnyDescription } from '../../query/description';
import { NoteCategorySchema, UserSchema } from '../../schema/user';
import { QueryableNote, queryableNoteDescription } from '../note/descriptions/note';
import {
  array,
  assign,
  Infer,
  InferRaw,
  instance,
  object,
  optional,
  record,
  string,
} from 'superstruct';

const typeObjectId = instance(ObjectId);

export const QueryableUser_NotesCategory = assign(
  NoteCategorySchema,
  object({
    order: object({
      items: array(
        assign(
          QueryableNote,
          object({
            $pagination: optional(RelayPagination(typeObjectId)),
          })
        )
      ),
      firstId: optional(typeObjectId),
      lastId: optional(typeObjectId),
    }),
  })
);

export type QueryableUser_NotesCategory = Infer<typeof QueryableUser_NotesCategory>;

export const QueryableUser = assign(
  UserSchema,
  object({
    notes: assign(
      UserSchema.schema.notes,
      object({
        category: record(string(), QueryableUser_NotesCategory),
      })
    ),
  })
);

export type QueryableUser = Infer<typeof QueryableUser>;

export interface QueryableUserContext {
  collections: Pick<
    MongoDBCollectionsOnlyNames,
    CollectionName.NOTES | CollectionName.USERS
  >;
}

export const queryableUserDescription: DeepAnyDescription<
  InferRaw<typeof QueryableUser>,
  unknown,
  QueryableUserContext
> = {
  notes: {
    category: {
      $anyKey: {
        order: {
          items: {
            ...queryableNoteDescription,
            $mapLastProject(ctx) {
              let { projectValue } = ctx;
              // Delete Note._id projection if set to 0
              // Exclusion is not allowed in $project except root _id
              if (queryableNoteDescription.$mapLastProject) {
                projectValue = queryableNoteDescription.$mapLastProject(ctx) as Record<
                  string,
                  unknown
                >;
                if (isObjectLike(projectValue) && projectValue._id === 0) {
                  delete projectValue._id;
                  return projectValue;
                }
              }
              return;
            },
          },
          $addStages({
            fields,
            customContext,
            relativeQuery,
            subStages,
            subLastProject,
          }) {
            const concatUserNotesFieldPath = 'notes.category._all.order.items';

            // Skip note lookup if nothing is projected in notes
            const itemsProject = subLastProject({ subPath: 'items' });
            const skipNoteLookup = isEmptyDeep(itemsProject);

            return [
              // Paginate each array 'notes.category.$anyKey.order'
              // Result is set to 'notes.category.$anyKey._order'
              // Set value has structure: {array: [...], sizes: [...]}
              {
                $set: Object.fromEntries(
                  fields.map(({ query, parentRelativePath, relativePath }) => [
                    `${parentRelativePath}._order`,
                    {
                      items: relayArrayPagination({
                        arrayFieldPath: relativePath,
                        paginations: query.items?.$args
                          ?.map((arg) => arg.$pagination)
                          .filter(isDefined),
                      }),
                      ...(query.firstId && {
                        firstId: {
                          $first: `$${relativePath}`,
                        },
                      }),
                      ...(query.lastId && {
                        lastId: {
                          $last: `$${relativePath}`,
                        },
                      }),
                    },
                  ])
                ),
              },
              // Unset original array 'order'
              {
                $unset: fields.map(({ relativePath }) => relativePath),
              },

              ...(!skipNoteLookup
                ? [
                    // Concat all arrays 'notes.category.$anyKey.order' to single array
                    ...relayMultiArrayConcat(
                      concatUserNotesFieldPath,
                      fields.map(
                        ({ parentRelativePath }) => `${parentRelativePath}._order.items`
                      )
                    ),
                    // Now can unwind since there is a single array
                    {
                      $unwind: {
                        path: `$${concatUserNotesFieldPath}.array`,
                        includeArrayIndex: '_index',
                        preserveNullAndEmptyArrays: true,
                      },
                    },

                    // Lookup Notes
                    {
                      $lookup: {
                        from: customContext.collections.notes.collectionName,
                        foreignField: '_id',
                        localField: `${concatUserNotesFieldPath}.array`,
                        as: `${concatUserNotesFieldPath}.array`,
                        pipeline: [
                          ...subStages({
                            subPath: 'items',
                          }),
                          {
                            $project: itemsProject,
                          },
                        ],
                      },
                    },
                    {
                      $set: {
                        [`${concatUserNotesFieldPath}.array`]: {
                          $arrayElemAt: [`$${concatUserNotesFieldPath}.array`, 0],
                        },
                      },
                    },

                    // Ensure array is in same order after $group
                    { $sort: { _index: 1 } },
                    {
                      $group: {
                        // Get first value from each document which are all same for user
                        ...(relativeQuery != null && typeof relativeQuery === 'object'
                          ? mapObject(relativeQuery, (key: string) => [
                              key,
                              { $first: `$${key}` },
                            ])
                          : {}),
                        // Using _array at root since cannot group to a nested path
                        _array: {
                          $push: `$${concatUserNotesFieldPath}.array`,
                        },
                        _id: '$_id',
                      },
                    },
                    // Put array back at path before unwind
                    {
                      $set: {
                        [`${concatUserNotesFieldPath}.array`]: `$_array`,
                      },
                    },
                    // Split concat array back into original paths
                    ...relayMultiArraySplit(
                      concatUserNotesFieldPath,
                      fields.map(({ relativePath }) => `${relativePath}.items`)
                    ),
                  ]
                : []),

              {
                $set: Object.fromEntries(
                  fields.map(({ query, relativePath, parentRelativePath }) => [
                    relativePath,
                    {
                      items: `$${relativePath}.items`,
                      ...(query.firstId && {
                        firstId: `$${parentRelativePath}._order.firstId`,
                      }),
                      ...(query.lastId && {
                        lastId: `$${parentRelativePath}._order.lastId`,
                      }),
                    },
                  ])
                ),
              },
            ];
          },
          $mapLastProject({ query, projectValue }) {
            if (!query.items || !isObjectLike(projectValue)) return;

            return {
              $replace: true,
              ...projectValue,
              items: {
                array: projectValue.items,
                sizes: 1,
              },
            };
          },
          $mapAggregateResult({ query, mergedQuery, result }) {
            if (!isObjectLike(result)) {
              return;
            }
            if (!isRelayArrayPaginationAggregateResult(result.items)) {
              return;
            }

            return {
              ...result,
              items: relayArrayPaginationMapAggregateResult(
                query.items?.$pagination,
                mergedQuery.items?.$args?.map((arg) => arg.$pagination).filter(isDefined),
                result.items,
                typeObjectId
              ),
            };
          },
        },
      },
    },
  },
  $mapLastProject({ query }) {
    return {
      _id: query._id ?? 0,
    };
  },
};
