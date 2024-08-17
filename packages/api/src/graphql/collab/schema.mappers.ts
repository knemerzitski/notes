import { GraphQLResolveInfo } from 'graphql';

import { RelayArrayPaginationConfig } from '../../mongodb/pagination/relay-array-pagination';
import { MongoQueryFn } from '../../mongodb/query/query';
import {
  RevisionChangesetSchema,
  RevisionRecordSchema,
} from '../../mongodb/schema/collab-text/collab-text';
import { PageInfoMapper } from '../base/schema.mappers';
import { ApiGraphQLContext } from '../context';
import {
  CollabTextrecordsConnectionArgs,
  CollabTexttextAtRevisionArgs,
  Maybe,
  ResolverTypeWrapper,
  ResolversTypes,
} from '../types.generated';
import { MaybePromise } from '~utils/types';

export interface CollabTextMapper {
  id(): MaybePromise<Maybe<string>>;
  headText(): RevisionChangesetMapper;
  tailText(): RevisionChangesetMapper;
  textAtRevision(args: CollabTexttextAtRevisionArgs): RevisionChangesetMapper;
  recordsConnection(
    args: CollabTextrecordsConnectionArgs,
    config: RelayArrayPaginationConfig
  ): CollabTextRecordsConnectionMapper;
}

export interface CollabTextPatchMapper {
  id(): ResolverTypeWrapper<string>;
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
  start(): ResolverTypeWrapper<number>;
  end(): ResolverTypeWrapper<number>;
}

export interface CollabTextRecordsConnectionMapper {
  records(
    ctx: ApiGraphQLContext,
    info: GraphQLResolveInfo
  ): ResolverTypeWrapper<CollabTextRecordMapper[]>;
  edges(
    ctx: ApiGraphQLContext,
    info: GraphQLResolveInfo
  ): ResolverTypeWrapper<CollabTextRecordEdgeMapper[]>;
  pageInfo(): PageInfoMapper;
}

export interface CollabTextRecordEdgeMapper {
  node(): CollabTextRecordMapper;
  cursor(): ResolversTypes['Cursor'];
}
