import { GraphQLResolveInfo } from 'graphql/index.js';
import { ObjectId } from 'mongodb';

import { QueryableNote } from '../../../mongodb/loaders/note/descriptions/note';
import { MongoQueryFn } from '../../../mongodb/query/query';
import { NoteUserSchema } from '../../../mongodb/schema/note-user';
import { GraphQLResolversContext } from '../../types';
import { ResolverTypeWrapper, ResolversTypes } from '../types.generated';

export interface UserNoteLinkMapper {
  readonly userId: ResolverTypeWrapper<ObjectId>;
  readonly query: MongoQueryFn<QueryableNote>;
}

export interface NotePreferencesMapper {
  readonly query: MongoQueryFn<NoteUserSchema['preferences']>;
}

export interface UserNoteLinkConnectionMapper {
  readonly noteLinks: (
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ) => ResolverTypeWrapper<UserNoteLinkMapper[]>;
  readonly edges: (
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ) => ResolverTypeWrapper<UserNoteLinkEdgeMapper[]>;
  readonly pageInfo: ResolversTypes['PageInfo'];
}

export interface UserNoteLinkEdgeMapper {
  readonly node: UserNoteLinkMapper;
  readonly cursor: ResolversTypes['Cursor'];
}
