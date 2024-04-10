import {
  CollaborativeDocumentdocumentArgs,
  CollaborativeDocumentrecordsConnectionArgs,
  ResolverTypeWrapper,
} from '../types.generated';
import { PageInfoMapper } from '../base/schema.mappers';
import { Changeset } from '~collab/changeset/changeset';

import { RelayArrayPaginationConfig } from '../../mongoose/operations/pagination/relayArrayPagination';

export interface RevisionChangesetMapper {
  revision(): ResolverTypeWrapper<number>;
  changeset(): ResolverTypeWrapper<Changeset>;
}

export interface CollaborativeDocumentSelectionRangeMapper {
  start(): ResolverTypeWrapper<number>;
  end(): ResolverTypeWrapper<number>;
}

export interface CollaborativeDocumentRecordMapper {
  id(): ResolverTypeWrapper<string>;
  creatorUserId(): ResolverTypeWrapper<string>;
  change(): RevisionChangesetMapper;
  beforeSelection(): CollaborativeDocumentSelectionRangeMapper;
  afterSelection(): CollaborativeDocumentSelectionRangeMapper;
}

export interface CollaborativeDocumentMapper {
  id(): ResolverTypeWrapper<string>;
  headDocument(): RevisionChangesetMapper;
  tailDocument(): RevisionChangesetMapper;
  document(args: CollaborativeDocumentdocumentArgs): RevisionChangesetMapper;
  recordsConnection(
    args: CollaborativeDocumentrecordsConnectionArgs,
    config: RelayArrayPaginationConfig
  ): CollaborativeDocumentRecordConnectionMapper;
}

export interface CollaborativeDocumentRecordConnectionMapper {
  edges(): CollaborativeDocumentRecordEdgeMapper[];
  pageInfo(): PageInfoMapper;
}

export interface CollaborativeDocumentRecordEdgeMapper {
  node(): CollaborativeDocumentRecordMapper;
  cursor(): ResolverTypeWrapper<string>;
}
