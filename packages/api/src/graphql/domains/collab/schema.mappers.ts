import { QueryableCollabRecord } from '../../../mongodb/loaders/note/descriptions/collab-record';
import { QueryableCollabText } from '../../../mongodb/loaders/note/descriptions/collab-text';
import { CursorBoundPagination } from '../../../mongodb/pagination/cursor-struct';
import { MongoQueryFn } from '../../../mongodb/query/query';
import { TextRecordSchema } from '../../../mongodb/schema/collab-text';
import { PreFetchedArrayGetItemFn } from '../../utils/pre-execute';
import { ResolverTypeWrapper, ResolversTypes } from '../types.generated';

export interface CollabTextMapper {
  readonly id: ResolverTypeWrapper<string>;
  readonly query: MongoQueryFn<QueryableCollabText>;
}

export interface CollabTextRecordMapper {
  readonly parentId: ResolverTypeWrapper<string>;
  readonly query: MongoQueryFn<QueryableCollabRecord>;
}

export interface RevisionChangesetMapper {
  readonly query: MongoQueryFn<TextRecordSchema>;
}

export interface ComposedTextRecordMapper {
  readonly query: MongoQueryFn<TextRecordSchema>;
}

export interface CollabTextRecordConnectionMapper {
  readonly pagination: CursorBoundPagination<number>;
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
