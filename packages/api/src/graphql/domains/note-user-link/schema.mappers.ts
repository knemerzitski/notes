import { ObjectId } from 'mongodb';
import { MongoQueryFn } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/descriptions/note';
import { NoteUserSchema } from '../../../mongodb/schema/note-user';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLResolversContext } from '../../types';
import { ResolverTypeWrapper, ResolversTypes } from '../types.generated';

export interface UserNoteLinkMapper {
  readonly userId: ObjectId;
  readonly query: MongoQueryFn<QueryableNote>;
}

export interface PublicUserNoteLinkMapper {
  readonly noteId: ResolverTypeWrapper<ObjectId>;
  readonly query: MongoQueryFn<NonNullable<QueryableNote['users']>[0]>;
}

export interface NotePreferencesMapper {
  readonly query: MongoQueryFn<NoteUserSchema['preferences']>;
}

export interface UserNoteLinkConnectionMapper {
  readonly userNoteLinks: (
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
