import { MongoQueryFn } from '../../mongodb/query/query';
import {
  RevisionChangesetSchema,
  RevisionRecordSchema,
  SelectionRangeSchema,
} from '../../mongodb/schema/collab-text/collab-text';
import { ResolverTypeWrapper, ResolversTypes } from '../types.generated';
import { QueryableCollabTextSchema } from '../../mongodb/schema/collab-text/query/collab-text';
import { RelayBoundPagination } from '../../mongodb/pagination/relay-array-pagination';
import { PreFetchedArrayGetItemFn } from '../utils/pre-execute';

export interface CollabTextMapper {
  readonly id: ResolverTypeWrapper<string>;
  readonly query: MongoQueryFn<QueryableCollabTextSchema>;
}

export interface CollabTextRecordMapper {
  readonly parentId: ResolverTypeWrapper<string>;
  readonly query: MongoQueryFn<RevisionRecordSchema>;
}

export interface RevisionChangesetMapper {
  readonly query: MongoQueryFn<RevisionChangesetSchema>;
}

export interface CollabTextSelectionRangeMapper {
  readonly query: MongoQueryFn<SelectionRangeSchema>;
}

export interface CollabTextRecordConnectionMapper {
  readonly pagination: RelayBoundPagination<number>;
  readonly getRecord: PreFetchedArrayGetItemFn<CollabTextRecordMapper>;
  readonly getHeadAndTailRevision: () => ResolverTypeWrapper<
    | {
        tailRevision: number;
        headRevision: number;
      }
    | undefined
  >;
}

export interface CollabTextRecordEdgeMapper {
  readonly node: CollabTextRecordMapper;
  readonly cursor: ResolversTypes['Cursor'];
}

export interface CollabTextPatchMapper {
  readonly id: ResolverTypeWrapper<string>;
  readonly isExistingRecord: ResolverTypeWrapper<boolean>;
  readonly newRecord: ResolverTypeWrapper<CollabTextRecordMapper>;
}
