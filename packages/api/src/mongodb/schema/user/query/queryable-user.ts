import mapObject from 'map-obj';

import { ObjectId } from 'mongodb';

import isObjectLike from '~utils/type-guards/isObjectLike';

import { CollectionName, MongoDBCollections } from '../../../collections';
import { MongoDBContext } from '../../../lambda-context';
import relayArrayPagination, {
  relayArrayPaginationMapAggregateResult,
  relayMultiArraySplit,
  relayMultiArrayConcat,
  isRelayArrayPaginationAggregateResult,
} from '../../../pagination/relayArrayPagination';
import asArrayFieldDescription from '../../../query/asArrayFieldDescription';
import { DeepAnyDescription } from '../../../query/description';
import {
  QueryableUserNote,
  QueryableUserNoteContext,
  queryableUserNoteDescription,
} from '../../user-note/query/queryable-user-note';
import { UserSchema } from '../user';

import user_userNoteLookup, { User_UserNoteLookup } from './user_userNoteLookup';

export type QueryableUser = Omit<UserSchema, 'notes'> & {
  notes: Omit<UserSchema['notes'], 'category'> & {
    category: {
      [Key in string]?: Omit<UserSchema['notes']['category'][Key], 'order'> & {
        order: {
          items: User_UserNoteLookup<QueryableUserNote>[];
          firstId: ObjectId;
          lastId: ObjectId;
        };
      };
    };
  };
};

export type QueryableUserContext = {
  collections: {
    [CollectionName.USER_NOTES]: Pick<
      MongoDBContext<MongoDBCollections>['collections'][CollectionName.USER_NOTES],
      'collectionName'
    >;
  };
} & QueryableUserNoteContext;

export const queryableUserDescription: DeepAnyDescription<
  QueryableUser,
  unknown,
  QueryableUserContext
> = {
  notes: {
    category: {
      $anyKey: {
        order: {
          items: {
            ...asArrayFieldDescription(queryableUserNoteDescription),
            $mapLastProject(query, projectValue) {
              if (!query.$query) return;

              // Delete UserNote._id projection if set to 0
              // Exclusion is not allowed in $project except root _id
              if (queryableUserNoteDescription.$mapLastProject) {
                projectValue = queryableUserNoteDescription.$mapLastProject(
                  query.$query,
                  projectValue
                );
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
            subStages: innerStages,
            subLastProject: innerLastProject,
          }) {
            const concatUserNotesFieldPath = 'notes.category._all.order.items';

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
                        paginations: query.items?.$paginations,
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
              // Lookup UserNote
              ...user_userNoteLookup({
                collectionName:
                  customContext.collections[CollectionName.USER_NOTES].collectionName,
                fieldPath: `${concatUserNotesFieldPath}.array`,
                pipeline: [
                  ...innerStages({
                    subPath: 'items',
                  }),
                  {
                    $project: innerLastProject({ subPath: 'items' }),
                  },
                ],
              }),
              // Ensure array is in same order after $group
              { $sort: { _index: 1 } },
              {
                $group: {
                  _id: '$_id',
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
          $mapLastProject(query, projectValue) {
            if (!query.items?.$query || !isObjectLike(projectValue)) return;

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
                mergedQuery.items?.$paginations,
                result.items
              ),
            };
          },
        },
      },
    },
  },
  $mapLastProject(query) {
    return {
      _id: query._id ?? 0,
    };
  },
};
