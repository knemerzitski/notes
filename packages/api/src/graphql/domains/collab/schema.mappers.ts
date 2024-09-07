import { MongoQueryFn } from '../../../mongodb/query/query';
import {
  RevisionChangesetSchema,
  SelectionRangeSchema,
} from '../../../mongodb/schema/collab-text';
import { ResolverTypeWrapper, ResolversTypes } from '../types.generated';
import { QueryableCollabText } from '../../../mongodb/descriptions/collab-text';
import { RelayBoundPagination } from '../../../mongodb/pagination/relay-array-pagination';
import { QueryableRevisionRecord } from '../../../mongodb/descriptions/revision-record';
import { PreFetchedArrayGetItemFn } from '../../utils/pre-execute';

export interface CollabTextMapper {
  readonly id: ResolverTypeWrapper<string>;
  readonly query: MongoQueryFn<typeof QueryableCollabText>;
}

export interface CollabTextRecordMapper {
  readonly parentId: ResolverTypeWrapper<string>;
  readonly query: MongoQueryFn<typeof QueryableRevisionRecord>;
}

export interface RevisionChangesetMapper {
  readonly query: MongoQueryFn<typeof RevisionChangesetSchema>;
}

export interface CollabTextSelectionRangeMapper {
  readonly query: MongoQueryFn<typeof SelectionRangeSchema>;
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
