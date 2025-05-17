import mapObject from 'map-obj';
import { Document } from 'mongodb';
import { assign, Infer, InferRaw, object, omit, pick } from 'superstruct';

import { CollectionName } from '../../../collection-names';
import { MongoDBCollectionsOnlyNames } from '../../../collections';
import { DescriptionDeep } from '../../../query/description';
import { isQueryOnlyId } from '../../../query/utils/is-query-only-id';
import { CollabRecordSchema } from '../../../schema/collab-record';
import { UserSchema } from '../../../schema/user';

export const QueryableCollabRecord = assign(
  omit(CollabRecordSchema, ['authorId']),
  object({
    author: pick(UserSchema, ['_id', 'profile']),
  })
);

export type QueryableCollabRecord = Infer<typeof QueryableCollabRecord>;

export interface QueryableCollabRecordContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.USERS>;
}

export const queryableCollabRecordDescription: DescriptionDeep<
  InferRaw<typeof QueryableCollabRecord>,
  unknown,
  QueryableCollabRecordContext
> = {
  author: {
    $addStages({ fields, customContext, subStages, subLastProject, relativeQuery }) {
      return fields.flatMap<Document>(({ query, parentRelativePath }) => {
        if (isQueryOnlyId(query)) {
          return [
            {
              $set: {
                [`author`]: {
                  _id: `$authorId`,
                },
              },
            },
          ];
        }

        return [
          {
            $unwind: {
              path: `$${parentRelativePath}.array`,
              includeArrayIndex: '_index',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Lookup Users
          {
            $lookup: {
              from: customContext.collections.users.collectionName,
              foreignField: '_id',
              localField: `${parentRelativePath}.array.authorId`,
              as: `${parentRelativePath}.array.author`,
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
              [`${parentRelativePath}.array.author`]: {
                $arrayElemAt: [`$${parentRelativePath}.array.author`, 0],
              },
            },
          },
          // Ensure array is in same order after $group
          { $sort: { _index: 1 } },
          {
            $group: {
              // Get first value from each document which are all same for user
              ...(relativeQuery != null && typeof relativeQuery === 'object'
                ? mapObject(relativeQuery, (key: string) => [key, { $first: `$${key}` }])
                : {}),
              // Using _array at root since cannot group to a nested path
              _array: {
                $push: `$${parentRelativePath}.array`,
              },
              _id: '$_id',
            },
          },
          // Put array back at path before unwind
          {
            $set: {
              [`${parentRelativePath}.array`]: `$_array`,
            },
          },
        ];
      });
    },
  },
  $mapLastProject({ projectValue }) {
    return {
      _id: projectValue._id ?? 0,
    };
  },
};
