import { RevisionRecordSchema, CollabTextSchema } from '../../mongodb/schema/collab-text';
import { QueryableUserLoader } from '../../mongodb/loaders/user';
import { StrictMongoQueryFn } from '../../mongodb/query/query';
import { isQueryOnlyId } from '../../mongodb/query/utils/is-query-only-id';
import { InferRaw } from 'superstruct';
import { StructQuery } from '../../mongodb/query/struct-query';
import { QueryableCollabText } from '../../mongodb/descriptions/collab-text';
import { QueryableRevisionRecord } from '../../mongodb/descriptions/revision-record';

export interface QueryWithCollabTextSchemaParams {
  collabText: InferRaw<typeof CollabTextSchema>;
  userLoader: QueryableUserLoader;
}

export function queryWithCollabTextSchema({
  collabText,
  userLoader,
}: QueryWithCollabTextSchemaParams): StrictMongoQueryFn<typeof QueryableCollabText> {
  return StructQuery.get(QueryableCollabText).createStrictQueryFnFromRaw(
    async (query) => {
      const queryRecords = query.records;
      if (!queryRecords) {
        return collabText;
      }

      return {
        ...collabText,
        records: await Promise.all(
          collabText.records.map((record) =>
            queryWithRevisionRecordSchema({
              record,
              userLoader,
            })(queryRecords)
          )
        ),
      };
    }
  );
}

export interface QueryWithRevisionRecordSchemaParams {
  record: InferRaw<typeof RevisionRecordSchema>;
  userLoader: QueryableUserLoader;
}

export function queryWithRevisionRecordSchema({
  record,
  userLoader,
}: QueryWithRevisionRecordSchemaParams): StrictMongoQueryFn<
  typeof QueryableRevisionRecord
> {
  return StructQuery.get(QueryableRevisionRecord).createStrictQueryFnFromRaw(
    async (query) => {
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

      return {
        ...record,
        creatorUser,
      };
    }
  );
}
