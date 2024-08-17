import { MongoQueryFn } from '../../mongodb/query/query';
import {
  RevisionChangesetSchema,
  RevisionRecordSchema,
  SelectionRangeSchema,
} from '../../mongodb/schema/collab-text/collab-text';
import { ResolverTypeWrapper, ResolversTypes } from '../types.generated';
import { QueryableCollabTextSchema } from '../../mongodb/schema/collab-text/query/collab-text';
import { RelayBoundPagination } from '../../mongodb/pagination/relay-array-pagination';
import { PreFetchedArrayGetItemFn } from '../utils/with-pre-fetched-array-size';

export interface CollabTextMapper {
  readonly id: ResolverTypeWrapper<string>;
  readonly query: MongoQueryFn<QueryableCollabTextSchema>;
}

export interface CollabTextPatchMapper {
  id: ResolverTypeWrapper<string>;
  isExistingRecord?(): ResolverTypeWrapper<boolean>;
  newRecord?(): ResolverTypeWrapper<CollabTextRecordMapper>;
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

export interface CollabTextRecordsConnectionMapper {
  pagination: RelayBoundPagination<number>;
  getRecord: PreFetchedArrayGetItemFn<CollabTextRecordMapper>;
  getHeadAndTailRevision: () => ResolverTypeWrapper<
    | {
        tailRevision: number;
        headRevision: number;
      }
    | undefined
  >;
}

export interface CollabTextRecordEdgeMapper {
  node(): CollabTextRecordMapper;
  cursor(): ResolversTypes['Cursor'];
}
