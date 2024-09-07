import { Changeset } from '~collab/changeset/changeset';
import {
  RevisionRecordSchema,
  SelectionRangeSchema,
  CollabTextSchema,
} from '../../mongodb/schema/collab-text';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { StrictMongoQueryFn } from '../../mongodb/query/query';
import { isQueryOnlyId } from '../../mongodb/query/utils/is-query-only-id';
import { InferRaw } from 'superstruct';
import { StructQuery } from '../../mongodb/query/struct-query';
import { QueryableCollabText } from '../../mongodb/descriptions/collab-text';
import { QueryableRevisionRecord } from '../../mongodb/descriptions/revision-record';

interface CreateCollabTextParams {
  creatorUserId: RevisionRecordSchema['creatorUserId'];
  initialText: string;
  afterSelection?: SelectionRangeSchema;
}

/**
 * Create CollabText with inital values
 */
export function createCollabText({
  initialText,
  creatorUserId,
  afterSelection,
}: CreateCollabTextParams): InferRaw<typeof CollabTextSchema> & {
  records: [
    InferRaw<typeof CollabTextSchema>['records'][0],
    ...InferRaw<typeof CollabTextSchema>['records'],
  ];
} {
  const changeset = Changeset.fromInsertion(initialText).serialize();
  return {
    headText: {
      revision: 1,
      changeset,
    },
    tailText: {
      revision: 0,
      changeset: Changeset.EMPTY.serialize(),
    },
    records: [
      {
        creatorUserId,
        userGeneratedId: '',
        revision: 1,
        changeset,
        beforeSelection: {
          start: 0,
        },
        afterSelection: afterSelection ?? {
          start: initialText.length,
        },
        createdAt: new Date(),
      },
    ],
  };
}

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
