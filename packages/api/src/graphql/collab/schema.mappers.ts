import {
  CollabTextrecordsConnectionArgs,
  CollabTexttextAtRevisionArgs,
  ResolverTypeWrapper,
  ResolversTypes,
} from '../types.generated';
import { PageInfoMapper } from '../base/schema.mappers';

import { RelayArrayPaginationConfig } from '../../mongodb/operations/pagination/relayArrayPagination';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLResolversContext } from '../context';

export interface RevisionChangesetMapper {
  revision(): ResolverTypeWrapper<number>;
  changeset(): ResolversTypes['Changeset'];
}

export interface CollabTextSelectionRangeMapper {
  start(): ResolverTypeWrapper<number>;
  end(): ResolverTypeWrapper<number>;
}

export interface CollabTextRecordMapper {
  id(): ResolverTypeWrapper<string>;
  creatorUserId(): ResolverTypeWrapper<string>;
  change(): RevisionChangesetMapper;
  beforeSelection(): CollabTextSelectionRangeMapper;
  afterSelection(): CollabTextSelectionRangeMapper;
}

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
  ): CollabTextRecordConnectionMapper;
}

export interface CollabTextPatchMapper {
  id(): ResolverTypeWrapper<string>;
  newRecord?: ResolversTypes['CollabTextRecord'];
  isExistingRecord?: boolean;
}

export interface CollabTextRecordConnectionMapper {
  records(): ResolverTypeWrapper<CollabTextRecordMapper[]>;
  edges(): ResolverTypeWrapper<CollabTextRecordEdgeMapper[]>;
  pageInfo(): PageInfoMapper;
}

export interface CollabTextRecordEdgeMapper {
  node(): CollabTextRecordMapper;
  cursor(): ResolversTypes['Cursor'];
}
