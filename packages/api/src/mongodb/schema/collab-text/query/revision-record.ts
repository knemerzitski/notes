import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import { QueryableUserLoader } from '../../../loaders/queryable-user-loader';
import { DeepAnyDescription } from '../../../query/description';
import { ObjectQueryDeep, QueryResultDeep } from '../../../query/query';
import { isQueryOnlyId } from '../../../query/utils/is-query-only-id';
import { UserSchema } from '../../user/user';
import { RevisionRecordSchema } from '../collab-text';

export type QueryableRevisionRecord = Omit<RevisionRecordSchema, 'creatorUserId'> & {
  creatorUser: Pick<UserSchema, '_id' | 'thirdParty' | 'profile'>;
};

export interface QueryWithRevisionRecordSchemaParams {
  query: ObjectQueryDeep<QueryableRevisionRecord>;
  record: RevisionRecordSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithRevisionRecordSchema({
  query,
  record,
  userLoader,
}: QueryWithRevisionRecordSchemaParams): Promise<QueryResultDeep<QueryableRevisionRecord>> {
  const queryCreatorUser = query.creatorUser;
  if (!queryCreatorUser) {
    return record;
  }

  if (isQueryOnlyId(queryCreatorUser)) {
    return {
      ...record,
      creatorUser: { _id: record.creatorUserId },
    };
  }

  const creatorUser = await userLoader.load({
    id: {
      userId: record.creatorUserId,
    },
    query: queryCreatorUser,
  });
  if (!creatorUser) {
    return record;
  }

  return {
    ...record,
    creatorUser,
  };
}

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
