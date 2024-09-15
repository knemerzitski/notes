import { isDefined } from '~utils/type-guards/is-defined';
import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import {
  consecutiveIntArrayPagination,
  consecutiveIntArrayPaginationMapAggregateResult,
} from '../../../pagination/consecutive-int-array-pagination';
import {
  RelayArrayPaginationAggregateResult,
  RelayArrayPaginationInput,
  RelayPagination,
} from '../../../pagination/relay-array-pagination';
import { DeepAnyDescription } from '../../../query/description';
import { CollabTextSchema, RevisionRecordSchema } from '../../../schema/collab-text';
import {
  QueryableRevisionRecord,
  queryableRevisionRecordDescription,
} from './revision-record';
import { PartialQueryResultDeep } from '../../../query/query';
import {
  array,
  assign,
  Infer,
  InferRaw,
  number,
  object,
  omit,
  optional,
} from 'superstruct';

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
  T extends PartialQueryResultDeep<
    Pick<InferRaw<typeof RevisionRecordSchema>, 'revision'>
  >,
>(
  pagination: NonNullable<RelayArrayPaginationInput<number>['paginations']>[0],
  result: RelayArrayPaginationAggregateResult<T>
): T[] {
  return consecutiveIntArrayPaginationMapAggregateResult(pagination, result, toCursor);
}

function toCursor(
  record: PartialQueryResultDeep<Pick<InferRaw<typeof RevisionRecordSchema>, 'revision'>>
) {
  return QueryableRevisionRecord.schema.revision.create(record.revision);
}

export const QueryableCollabText = assign(
  omit(CollabTextSchema, ['records']),
  object({
    records: array(
      assign(
        QueryableRevisionRecord,
        object({
          $pagination: optional(RelayPagination(number())),
        })
      )
    ),
  })
);

export type QueryableCollabText = Infer<typeof QueryableCollabText>;

export interface QueryableCollabTextContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.USERS>;
}

export const collabTextDescription: DeepAnyDescription<
  InferRaw<typeof QueryableCollabText>,
  {
    records: RecordsPaginationResult<
      PartialQueryResultDeep<InferRaw<typeof QueryableRevisionRecord>>
    >;
  },
  QueryableCollabTextContext
> = {
  records: {
    ...queryableRevisionRecordDescription,
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
