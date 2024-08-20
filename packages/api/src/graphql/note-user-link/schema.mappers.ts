import { ObjectId } from 'mongodb';

import { NoteTextField, ResolverTypeWrapper, ResolversTypes } from '../types.generated';

import { CollabTextMapper } from '../collab/schema.mappers';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLResolversContext } from '../context';
import { MongoQueryFn } from '../../mongodb/query/query';
import { NoteUserSchema } from '../../mongodb/schema/note/note-user';
import { QueryableNote } from '../../mongodb/schema/note/query/queryable-note';

export interface NoteMapper {
  readonly userId: ObjectId;
  readonly query: MongoQueryFn<QueryableNote>;
}

export interface NoteUserMapper {
  readonly currentUserId: ObjectId;
  readonly queryUser: MongoQueryFn<NonNullable<QueryableNote['users']>[0]>;
  readonly queryAllUsers: MongoQueryFn<QueryableNote['users']>;
}

export interface NoteTextFieldEntryMapper {
  readonly key: NoteTextField;
  readonly value: CollabTextMapper;
}

export interface NotePreferencesMapper {
  readonly query: MongoQueryFn<NoteUserSchema['preferences']>;
}

export interface NoteConnectionMapper {
  readonly notes: (
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ) => ResolverTypeWrapper<NoteMapper[]>;
  readonly edges: (
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ) => ResolverTypeWrapper<NoteEdgeMapper[]>;
  readonly pageInfo: ResolversTypes['PageInfo'];
}

export interface NoteEdgeMapper {
  readonly node: NoteMapper;
  readonly cursor: ResolversTypes['Cursor'];
}