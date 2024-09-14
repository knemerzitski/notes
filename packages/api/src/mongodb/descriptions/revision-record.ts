import { CollectionName, MongoDBCollectionsOnlyNames } from '../collections';
import { DeepAnyDescription } from '../query/description';
import { isQueryOnlyId } from '../query/utils/is-query-only-id';
import { UserSchema } from '../schema/user';
import { RevisionRecordSchema } from '../schema/collab-text';
import { assign, Infer, InferRaw, object, omit, pick } from 'superstruct';

export const QueryableRevisionRecord = assign(
  omit(RevisionRecordSchema, ['creatorUserId']),
  object({
    creatorUser: pick(UserSchema, ['_id', 'thirdParty', 'profile']),
  })
);

export function revisionRecordSchemaToQueryable<
  T extends InferRaw<typeof RevisionRecordSchema> | Infer<typeof RevisionRecordSchema>,
>(record: T) {
  return {
    ...record,
    creatorUser: {
      _id: record.creatorUserId,
    },
  };
}

export interface QueryableRevisionRecordContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.USERS>;
}

export const queryableRevisionRecordDescription: DeepAnyDescription<
  InferRaw<typeof QueryableRevisionRecord>,
  unknown,
  QueryableRevisionRecordContext
> = {
  creatorUser: {
    $addStages({ fields, customContext, subStages, subLastProject }) {
      return fields.flatMap<Document>(({ query, parentRelativePath }) => {
        if (isQueryOnlyId(query)) {
          return [
            {
              $set: {
                creatorUser: {
                  _id: `${parentRelativePath}.creatorUserId`,
                },
              },
            },
          ];
        }

        return [
          {
            $lookup: {
              from: customContext.collections.users.collectionName,
              foreignField: '_id',
              localField: `${parentRelativePath}.creatorUserId`,
              as: `${parentRelativePath}.creatorUser`,
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
              [`${parentRelativePath}.creatorUser`]: {
                $arrayElemAt: [`$${parentRelativePath}.creatorUser`, 0],
              },
            },
          },
        ];
      });
    },
  },
};
