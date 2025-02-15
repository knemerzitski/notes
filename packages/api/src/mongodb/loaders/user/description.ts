import mapObject from 'map-obj';

import { ObjectId } from 'mongodb';

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
import { isEmptyDeep } from '~utils/object/is-empty-deep';
import { isDefined } from '~utils/type-guards/is-defined';
import { isObjectLike } from '~utils/type-guards/is-object-like';

import { MongoDBCollectionsOnlyNames, CollectionName } from '../../collections';
import {
  cursorArrayPagination,
  cursorMultiArrayConcat,
  cursorMultiArraySplit,
  isCursorArrayPaginationAggregateResult,
  cursorArrayPaginationMapAggregateResult,
} from '../../pagination/cursor-array-pagination';
import { CursorPagination } from '../../pagination/cursor-struct';
import { DescriptionDeep } from '../../query/description';
import { NoteCategorySchema, UserSchema } from '../../schema/user';
import { QueryableNote, queryableNoteDescription } from '../note/descriptions/note';

const typeObjectId = instance(ObjectId);

export const QueryableUser_NotesCategory = assign(
  NoteCategorySchema,
  object({
    notes: array(
      assign(
        QueryableNote,
        object({
          $pagination: optional(CursorPagination(typeObjectId)),
        })
      )
    ),
    firstNoteId: optional(typeObjectId),
    lastNoteId: optional(typeObjectId),
  })
);

export type QueryableUser_NotesCategory = Infer<typeof QueryableUser_NotesCategory>;

export const QueryableUser = assign(
  UserSchema,
  object({
    note: assign(
      UserSchema.schema.note,
      object({
        categories: record(string(), QueryableUser_NotesCategory),
      })
    ),
  })
);

export type QueryableUser = Infer<typeof QueryableUser>;

export interface QueryableUserContext {
  collections: Pick<
    MongoDBCollectionsOnlyNames,
    | CollectionName.NOTES
    | CollectionName.USERS
    | CollectionName.OPEN_NOTES
    | CollectionName.COLLAB_RECORDS
  >;
}

export const queryableUserDescription: DescriptionDeep<
  InferRaw<typeof QueryableUser>,
  unknown,
  QueryableUserContext
> = {
  note: {
    categories: {
      $anyKey: {
        notes: {
          ...queryableNoteDescription,
          $addStages({
            fields,
            customContext,
            relativeQuery,
            subStages,
            subLastProject,
          }) {
            const concatUserNotesFieldPath = 'note.categories._all.notes';

            // Skip note lookup if nothing is projected in notes
            const notesProject = subLastProject();
            if (isEmptyDeep(notesProject)) {
              return;
            }

            return [
              // Paginate each array 'notes.category.$anyKey.noteIds'
              // Result is set to 'notes.category.$anyKey.notes'
              // Set value has structure: {array: [...], sizes: [...]}
              {
                $set: Object.fromEntries(
                  fields.map(({ query, parentRelativePath, relativePath }) => [
                    relativePath,
                    cursorArrayPagination({
                      arrayFieldPath: `${parentRelativePath}.noteIds`,
                      paginations: query.$args
                        ?.map((arg) => arg.$pagination)
                        .filter(isDefined),
                    }),
                  ])
                ),
              },
              // Concat all arrays 'notes.category.$anyKey.notes' to single array
              ...cursorMultiArrayConcat(
                concatUserNotesFieldPath,
                fields.map(({ relativePath }) => relativePath)
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
                  from: customContext.collections[CollectionName.NOTES].collectionName,
                  foreignField: '_id',
                  localField: `${concatUserNotesFieldPath}.array`,
                  as: `${concatUserNotesFieldPath}.array`,
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
              ...cursorMultiArraySplit(
                concatUserNotesFieldPath,
                fields.map(({ relativePath }) => relativePath)
              ),
            ];
          },
          $mapLastProject(ctx) {
            const { projectValue } = ctx;

            // Delete Note._id projection if set to 0
            // Exclusion is not allowed in $project except root _id
            if (queryableNoteDescription.$mapLastProject) {
              const noteProjectValue = queryableNoteDescription.$mapLastProject(
                ctx
              ) as Record<string, unknown>;
              if (isObjectLike(noteProjectValue) && projectValue._id === 0) {
                delete projectValue._id;
              }
            }

            if (!isObjectLike(projectValue)) return;

            return {
              $replace: true,
              array: projectValue,
              sizes: 1,
            };
          },
          $mapAggregateResult({ query, mergedQuery, result }) {
            if (!isObjectLike(result)) {
              return;
            }
            if (!isCursorArrayPaginationAggregateResult(result)) {
              return;
            }

            return cursorArrayPaginationMapAggregateResult(
              query.$pagination,
              mergedQuery.$args?.map((arg) => arg.$pagination).filter(isDefined),
              result,
              typeObjectId
            );
          },
        },
        firstNoteId: {
          $addStages({ fields }) {
            return [
              {
                $set: Object.fromEntries(
                  fields.map(({ parentRelativePath, relativePath }) => [
                    relativePath,
                    {
                      $first: `$${parentRelativePath}.noteIds`,
                    },
                  ])
                ),
              },
            ];
          },
        },
        lastNoteId: {
          $addStages({ fields }) {
            return [
              {
                $set: Object.fromEntries(
                  fields.map(({ parentRelativePath, relativePath }) => [
                    relativePath,
                    {
                      $last: `$${parentRelativePath}.noteIds`,
                    },
                  ])
                ),
              },
            ];
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
