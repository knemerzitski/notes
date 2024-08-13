import { GraphQLResolveInfo } from 'graphql';

import { RelayArrayPaginationConfig } from '../../mongodb/pagination/relay-array-pagination';
import { PageInfoMapper } from '../base/schema.mappers';
import { GraphQLResolversContext } from '../context';
import {
  CollabTextrecordsConnectionArgs,
  CollabTexttextAtRevisionArgs,
  ResolverTypeWrapper,
  ResolversTypes,
} from '../types.generated';

export interface CollabTextMapper {
  id(): ResolverTypeWrapper<string>;
  headText(): RevisionChangesetMapper;
  tailText(): RevisionChangesetMapper;
  textAtRevision(args: CollabTexttextAtRevisionArgs): RevisionChangesetMapper;
  recordsConnection(
    args: CollabTextrecordsConnectionArgs,
    config: RelayArrayPaginationConfig,
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ): CollabTextRecordsConnectionMapper;
}

export interface CollabTextPatchMapper {
  id(): ResolverTypeWrapper<string>;
  isExistingRecord?(): ResolverTypeWrapper<boolean>;
  newRecord?(): ResolverTypeWrapper<CollabTextRecordMapper>;
}

export interface CollabTextRecordMapper {
  id(): ResolverTypeWrapper<string>;
  creatorUserId(): ResolverTypeWrapper<string>;
  change(): RevisionChangesetMapper;
  beforeSelection(): CollabTextSelectionRangeMapper;
  afterSelection(): CollabTextSelectionRangeMapper;
}

export interface RevisionChangesetMapper {
  revision(): ResolverTypeWrapper<number>;
  changeset(): ResolversTypes['Changeset'];
}

export interface CollabTextSelectionRangeMapper {
  start(): ResolverTypeWrapper<number>;
  end(): ResolverTypeWrapper<number>;
}

export interface CollabTextRecordsConnectionMapper {
  records(): ResolverTypeWrapper<CollabTextRecordMapper[]>;
  edges(): ResolverTypeWrapper<CollabTextRecordEdgeMapper[]>;
  pageInfo(): PageInfoMapper;
}

export interface CollabTextRecordEdgeMapper {
  node(): CollabTextRecordMapper;
  cursor(): ResolversTypes['Cursor'];
}
