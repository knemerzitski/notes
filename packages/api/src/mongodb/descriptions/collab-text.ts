import { isDefined } from '~utils/type-guards/is-defined';
import { CollectionName, MongoDBCollectionsOnlyNames } from '../collections';
import {
  consecutiveIntArrayPagination,
  consecutiveIntArrayPaginationMapAggregateResult,
} from '../pagination/consecutive-int-array-pagination';
import {
  RelayArrayPaginationAggregateResult,
  RelayArrayPaginationInput,
  RelayPagination,
} from '../pagination/relay-array-pagination';
import { DeepAnyDescription } from '../query/description';
import { CollabTextSchema, RevisionRecordSchema } from '../schema/collab-text';
import { QueryableRevisionRecord } from './revision-record';
import { QueryResultDeep } from '../query/query';

type RecordsPaginationOperationOptions = Omit<
  RelayArrayPaginationInput<number>,
  'arrayFieldPath' | 'arrayItemPath'
> & {
  fieldPath?: string;
};

type RecordsPaginationResult<T = RevisionRecordSchema> =
  RelayArrayPaginationAggregateResult<T>;

function recordsPagination(options: RecordsPaginationOperationOptions) {
  return consecutiveIntArrayPagination({
    arrayFieldPath: options.fieldPath ?? 'records',
    arrayItemPath: 'revision',
    ...options,
  });
}

function recordsPaginationMapAggregateResult<
  T extends Partial<Pick<RevisionRecordSchema, 'revision'>>,
>(
  pagination: NonNullable<RelayArrayPaginationInput<number>['paginations']>[0],
  result: RelayArrayPaginationAggregateResult<T>
): T[] {
  return consecutiveIntArrayPaginationMapAggregateResult(pagination, result, toCursor);
}

function toCursor(record?: Partial<Pick<RevisionRecordSchema, 'revision'>>) {
  const revision = record?.revision;
  if (revision == null) {
    throw new Error('Expected record.revision to be defined');
  }
  return revision;
}

export type QueryableCollabText = Omit<CollabTextSchema, 'records'> & {
  records: (QueryableRevisionRecord & {
    $pagination?: RelayPagination<number>;
  })[];
};

export interface QueryableCollabTextContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.USERS>;
}

export const collabTextDescription: DeepAnyDescription<
  QueryableCollabText,
  {
    records: RecordsPaginationResult<QueryResultDeep<QueryableRevisionRecord>>;
  },
  QueryableCollabTextContext
> = {
  records: {
    $addStages({ fields }) {
      return [
        {
          $set: Object.fromEntries(
            fields.map(({ query, relativePath, parentRelativePath }) => [
              `${parentRelativePath}._records`,
              recordsPagination({
                fieldPath: relativePath,
                paginations: query.$args?.map((arg) => arg.$pagination).filter(isDefined),
              }),
            ])
          ),
        },
        {
          $set: Object.fromEntries(
            fields.map(({ relativePath, parentRelativePath }) => [
              relativePath,
              `$${parentRelativePath}._records`,
            ])
          ),
        },
      ];
    },
    $mapLastProject({ projectValue }) {
      return {
        $replace: true,
        array: {
          ...projectValue,
          revision: 1,
        },
        sizes: 1,
      };
    },
    $mapAggregateResult({ query, result }) {
      if (!query.$pagination) {
        return result.array;
      }

      return recordsPaginationMapAggregateResult(query.$pagination, result);
    },
  },
};
