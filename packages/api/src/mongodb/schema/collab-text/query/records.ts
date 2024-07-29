import consecutiveIntArrayPagination, {
  consecutiveIntArrayPaginationMapAggregateResult,
} from '../../../pagination/consecutiveIntArrayPagination';
import {
  paginationStringToInt,
  RelayArrayPaginationInput,
  RelayArrayPaginationAggregateResult,
} from '../../../pagination/relayArrayPagination';
import { FieldDescription } from '../../../query/description';
import { DeepQueryResult } from '../../../query/query';
import { CollabTextSchema, RevisionRecordSchema } from '../collab-text';

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

export const recordsResolvers: FieldDescription<
  CollabTextSchema['records'],
  RecordsPaginationResult<DeepQueryResult<CollabTextSchema['records'][0]>>
> = {
  $addStages({ fields }) {
    return [
      {
        $set: Object.fromEntries(
          fields.map(({ query, relativePath, parentRelativePath }) => [
            `${parentRelativePath}._records`,
            recordsPagination({
              fieldPath: relativePath,
              paginations: query.$paginations?.map(paginationStringToInt),
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
  $mapLastProject(query) {
    return {
      $replace: true,
      array: {
        ...query.$query,
        revision: 1,
      },
      sizes: 1,
    };
  },
  $mapAggregateResult({ query, result }) {
    if (!query.$pagination) {
      return result.array;
    }

    return recordsPaginationMapAggregateResult(
      paginationStringToInt(query.$pagination),
      result
    );
  },
};
