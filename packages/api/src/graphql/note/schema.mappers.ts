import { ObjectId } from 'mongodb';

import { PageInfoMapper } from '../base/schema.mappers';
import {
  NoteCategory,
  NoteTextField,
  ResolverTypeWrapper,
  ResolversTypes,
} from '../types.generated';

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

export interface NotePreferencesPatchMapper {
  backgroundColor?(): ResolverTypeWrapper<string>;
}

export interface NotePatchMapper {
  id(): ResolverTypeWrapper<string>;
  textFields?(): ResolversTypes['NoteTextFieldEntryPatch'][];
  categoryName?(): ResolverTypeWrapper<NoteCategory>;
  preferences?(): NotePreferencesPatchMapper;
  location?(): ResolversTypes['NoteLocation'];
  deletedAt?(): ResolverTypeWrapper<Date>;
  readOnly?(): ResolverTypeWrapper<boolean>;
  users?(): ResolversTypes['NoteUserPatch'][];
  usersDeleted?(): ResolverTypeWrapper<string[]>;
}

export interface NotesConnectionMapper {
  notes(
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ): ResolverTypeWrapper<NoteMapper[]>;
  edges(
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ): ResolverTypeWrapper<NoteEdgeMapper[]>;
  pageInfo(): ResolverTypeWrapper<PageInfoMapper>;
}

export interface NoteEdgeMapper {
  node(): ResolverTypeWrapper<NoteMapper>;
  cursor(): ResolversTypes['Cursor'];
}
