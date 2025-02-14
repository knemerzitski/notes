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
import { isDefined } from '~utils/type-guards/is-defined';

import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import {
  consecutiveIntArrayPagination,
  consecutiveIntArrayPaginationMapAggregateResult,
} from '../../../pagination/consecutive-int-array-pagination';
import {
  CursorArrayPaginationAggregateResult,
  CursorArrayPaginationInput,
} from '../../../pagination/cursor-array-pagination';
import { CursorPagination } from '../../../pagination/cursor-struct';
import { DescriptionDeep } from '../../../query/description';
import { PartialQueryResultDeep } from '../../../query/query';
import { CollabTextSchema, CollabRecordSchema } from '../../../schema/collab-text';

import {
  QueryableCollabRecord,
  queryableCollabRecordDescription,
} from './revision-record';

type RecordsPaginationOperationOptions = Omit<
  CursorArrayPaginationInput<number>,
  'arrayFieldPath' | 'arrayItemPath'
> & {
  fieldPath?: string;
};

type RecordsPaginationResult<T = CollabRecordSchema> =
  CursorArrayPaginationAggregateResult<T>;

function recordsPagination(options: RecordsPaginationOperationOptions) {
  return consecutiveIntArrayPagination({
    arrayFieldPath: options.fieldPath ?? 'records',
    arrayItemPath: 'revision',
    ...options,
  });
}

function recordsPaginationMapAggregateResult<
  T extends PartialQueryResultDeep<Pick<InferRaw<typeof CollabRecordSchema>, 'revision'>>,
>(
  pagination: NonNullable<CursorArrayPaginationInput<number>['paginations']>[0],
  result: CursorArrayPaginationAggregateResult<T>
): T[] {
  return consecutiveIntArrayPaginationMapAggregateResult(pagination, result, toCursor);
}

function toCursor(
  record: PartialQueryResultDeep<Pick<InferRaw<typeof CollabRecordSchema>, 'revision'>>
) {
  return QueryableCollabRecord.schema.revision.create(record.revision);
}

export const QueryableCollabText = assign(
  omit(CollabTextSchema, ['records']),
  object({
    records: array(
      assign(
        QueryableCollabRecord,
        object({
          $pagination: optional(CursorPagination(number())),
        })
      )
    ),
  })
);

export type QueryableCollabText = Infer<typeof QueryableCollabText>;

export interface QueryableCollabTextContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.USERS>;
}

export const collabTextDescription: DescriptionDeep<
  InferRaw<typeof QueryableCollabText>,
  {
    records: RecordsPaginationResult<
      PartialQueryResultDeep<InferRaw<typeof QueryableCollabRecord>>
    >;
  },
  QueryableCollabTextContext
> = {
  records: {
    ...queryableCollabRecordDescription,
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
