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
import { PartialQueryResultDeep } from '../query/query';
import { array, assign, InferRaw, number, object, omit, optional } from 'superstruct';
import { StructQuery } from '../query/struct-query';

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
  const validatedRevision = StructQuery.get(
    QueryableRevisionRecord.schema.revision
  ).rawValueToValidated(record.revision);

  return validatedRevision;
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
