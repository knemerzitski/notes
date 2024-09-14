import { ObjectId } from 'mongodb';
import { MongoQueryFn } from '../../../mongodb/query/query';
import { NoteUserSchema } from '../../../mongodb/schema/note-user';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLResolversContext } from '../../types';
import { ResolverTypeWrapper, ResolversTypes } from '../types.generated';
import { QueryableNote, QueryableNoteUser } from '../../../mongodb/loaders/note/descriptions/note';

export interface UserNoteLinkMapper {
  readonly userId: ObjectId;
  readonly query: MongoQueryFn<typeof QueryableNote>;
}

export interface PublicUserNoteLinkMapper {
  readonly noteId: ResolverTypeWrapper<ObjectId>;
  readonly query: MongoQueryFn<typeof QueryableNoteUser>;
}

export interface NotePreferencesMapper {
  readonly query: MongoQueryFn<typeof NoteUserSchema.schema.preferences>;
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
