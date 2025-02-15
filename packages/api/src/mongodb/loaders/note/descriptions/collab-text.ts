import { array, assign, Infer, InferRaw, number, object, optional } from 'superstruct';
import { isEmptyDeep } from '~utils/object/is-empty-deep';
import { isDefined } from '~utils/type-guards/is-defined';

import { CollectionName, MongoDBCollectionsOnlyNames } from '../../../collections';
import {
  consecutiveIntPaginationExpressionMapAggregateResult,
  consecutiveIntPaginationsToExpression,
} from '../../../pagination/consecutive-int-array-pagination';
import { CursorArrayPaginationInput } from '../../../pagination/cursor-array-pagination';
import { CursorPagination } from '../../../pagination/cursor-struct';
import { DescriptionDeep } from '../../../query/description';
import { PartialQueryResultDeep } from '../../../query/query';

import { CollabRecordSchema } from '../../../schema/collab-record';
import { CollabTextSchema } from '../../../schema/collab-text';

import { QueryableCollabRecord, queryableCollabRecordDescription } from './collab-record';

type RecordsPaginationOperationOptions = Omit<
  CursorArrayPaginationInput<number>,
  'arrayFieldPath' | 'arrayItemPath'
> & {
  fieldPath?: string;
};

function recordsPagination(
  paginations: RecordsPaginationOperationOptions['paginations']
) {
  return consecutiveIntPaginationsToExpression({
    paginations,
    fields: {
      itemValue: '$revision',
      firstValue: '$$tailRevision',
      lastValue: '$$headRevision',
    },
  }).$expr;
}

function recordsPaginationMapAggregateResult<
  T extends PartialQueryResultDeep<Pick<InferRaw<typeof CollabRecordSchema>, 'revision'>>,
>(pagination: CursorPagination<number>, result: T[]): T[] {
  return consecutiveIntPaginationExpressionMapAggregateResult(
    pagination,
    result,
    toCursor
  );
}

function toCursor(
  record: PartialQueryResultDeep<Pick<InferRaw<typeof CollabRecordSchema>, 'revision'>>
) {
  return QueryableCollabRecord.schema.revision.create(record.revision);
}

export const QueryableCollabText = assign(
  CollabTextSchema,
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
  collections: Pick<
    MongoDBCollectionsOnlyNames,
    CollectionName.USERS | CollectionName.COLLAB_RECORDS
  >;
}

export const collabTextDescription: DescriptionDeep<
  InferRaw<typeof QueryableCollabText>,
  {
    records: PartialQueryResultDeep<InferRaw<typeof QueryableCollabRecord>>[];
  },
  QueryableCollabTextContext
> = {
  records: {
    ...queryableCollabRecordDescription,
    $addStages({ fields, subStages, subLastProject, customContext }) {
      // Support only first field, no dynamic keyed records
      const firstField = fields[0];
      if (!firstField) {
        return;
      }

      // Skip record lookup if nothing is projected
      const recordProject = subLastProject();
      if (isEmptyDeep(recordProject)) {
        return;
      }

      const { query, relativePath, parentRelativePath } = firstField;

      return [
        {
          $lookup: {
            from: customContext.collections[CollectionName.COLLAB_RECORDS].collectionName,
            let: {
              collabTextId: '$_id',
              tailRevision: `$${parentRelativePath}.tailText.revision`,
              headRevision: `$${parentRelativePath}.headText.revision`,
            },
            as: relativePath,
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ['$collabTextId', '$$collabTextId'],
                      },
                      recordsPagination(
                        query.$args?.map((arg) => arg.$pagination).filter(isDefined)
                      ),
                    ],
                  },
                },
              },
              {
                $sort: {
                  revision: 1,
                },
              },
              ...subStages(),
              {
                $project: recordProject,
              },
            ],
          },
        },
      ];
    },
    $mapLastProject() {
      return {
        // Revision is required to sort through paginations in $mapAggregateResult
        revision: 1,
      };
    },
    $mapAggregateResult({ query, result }) {
      if (!query.$pagination) {
        return result;
      }

      return recordsPaginationMapAggregateResult(query.$pagination, result);
    },
  },
};
