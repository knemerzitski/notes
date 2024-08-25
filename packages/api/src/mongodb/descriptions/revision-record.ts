import { CollectionName, MongoDBCollectionsOnlyNames } from '../collections';
import { DeepAnyDescription } from '../query/description';
import { isQueryOnlyId } from '../query/utils/is-query-only-id';
import { UserSchema } from '../schema/user';
import { RevisionRecordSchema } from '../schema/collab-text';

export type QueryableRevisionRecord = Omit<RevisionRecordSchema, 'creatorUserId'> & {
  creatorUser: Pick<UserSchema, '_id' | 'thirdParty' | 'profile'>;
};

export interface QueryableRevisionRecordContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.USERS>;
}

export const queryableRevisionRecordDescription: DeepAnyDescription<
  QueryableRevisionRecord,
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
