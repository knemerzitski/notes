import { Changeset } from '~collab/changeset/changeset';
import {
  RevisionRecordSchema,
  SelectionRangeSchema,
  CollabTextSchema,
} from '../../mongodb/schema/collab-text';
import { QueryableRevisionRecord } from '../../mongodb/descriptions/revision-record';
import { QueryableUserLoader } from '../../mongodb/loaders/queryable-user-loader';
import { ObjectQueryDeep, QueryResultDeep } from '../../mongodb/query/query';
import { isQueryOnlyId } from '../../mongodb/query/utils/is-query-only-id';
import { QueryableCollabText } from '../../mongodb/descriptions/collab-text';

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
}: CreateCollabTextParams): CollabTextSchema & {
  records: [RevisionRecordSchema, ...RevisionRecordSchema[]];
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
  query: ObjectQueryDeep<QueryableCollabText>;
  collabText: CollabTextSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithCollabTextSchema({
  query,
  collabText,
  userLoader,
}: QueryWithCollabTextSchemaParams): Promise<QueryResultDeep<QueryableCollabText>> {
  const queryRecords = query.records;
  if (!queryRecords) {
    return collabText;
  }

  return {
    ...collabText,
    records: await Promise.all(
      collabText.records.map((record) =>
        queryWithRevisionRecordSchema({
          query: queryRecords,
          record,
          userLoader,
        })
      )
    ),
  };
}

export interface QueryWithRevisionRecordSchemaParams {
  query: ObjectQueryDeep<QueryableRevisionRecord>;
  record: RevisionRecordSchema;
  userLoader: QueryableUserLoader;
}

export async function queryWithRevisionRecordSchema({
  query,
  record,
  userLoader,
}: QueryWithRevisionRecordSchemaParams): Promise<
  QueryResultDeep<QueryableRevisionRecord>
> {
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
