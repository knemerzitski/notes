import mapObject from 'map-obj';
import { assign, Infer, InferRaw, object, pick } from 'superstruct';

import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { DescriptionDeep } from '../../../query/description';
import { isQueryOnlyId } from '../../../query/utils/is-query-only-id';
import { RevisionRecordSchema } from '../../../schema/collab-text';
import { UserSchema } from '../../../schema/user';

export const QueryableRevisionRecord = assign(
  RevisionRecordSchema,
  object({
    creatorUser: pick(UserSchema, ['_id', 'profile']),
  })
);

export type QueryableRevisionRecord = Infer<typeof QueryableRevisionRecord>;

export interface QueryableRevisionRecordContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.USERS>;
}

export const queryableRevisionRecordDescription: DescriptionDeep<
  InferRaw<typeof QueryableRevisionRecord>,
  unknown,
  QueryableRevisionRecordContext
> = {
  creatorUser: {
    $addStages({ fields, customContext, subStages, subLastProject, relativeQuery }) {
      return fields.flatMap<Document>(({ query, parentRelativePath }) => {
        if (isQueryOnlyId(query)) {
          return [];
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
              localField: `${parentRelativePath}.array.creatorUser._id`,
              as: `${parentRelativePath}.array.creatorUser`,
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
              [`${parentRelativePath}.array.creatorUser`]: {
                $arrayElemAt: [`$${parentRelativePath}.array.creatorUser`, 0],
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
};
