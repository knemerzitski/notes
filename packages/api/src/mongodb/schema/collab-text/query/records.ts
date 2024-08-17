import {
  consecutiveIntArrayPaginationMapAggregateResult,
  consecutiveIntArrayPagination,
} from '../../../pagination/consecutive-int-array-pagination';
import {
  RelayArrayPaginationInput,
  RelayArrayPaginationAggregateResult,
  RelayPagination,
} from '../../../pagination/relay-array-pagination';
import { FieldDescription } from '../../../query/description';
import { DeepQueryResult } from '../../../query/query';
import { CollabTextSchema, RevisionRecordSchema } from '../collab-text';
import { isDefined } from '~utils/type-guards/is-defined';

export type RecordsPaginationOperationOptions = Omit<
  RelayArrayPaginationInput<number>,
  'arrayFieldPath' | 'arrayItemPath'
> & {
  fieldPath?: string;
};

export type RecordsPaginationResult<T = RevisionRecordSchema> =
  RelayArrayPaginationAggregateResult<T>;

export function recordsPagination(options: RecordsPaginationOperationOptions) {
  return consecutiveIntArrayPagination({
    arrayFieldPath: options.fieldPath ?? 'records',
    arrayItemPath: 'revision',
    ...options,
  });
}

export function recordsPaginationMapAggregateResult<
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

export type QueryableRecords = CollabTextSchema['records'] & {
  $pagination?: RelayPagination<number>;
};

export const recordsResolvers: FieldDescription<
  QueryableRecords,
  RecordsPaginationResult<DeepQueryResult<QueryableRecords[0]>>
> = {
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
};
