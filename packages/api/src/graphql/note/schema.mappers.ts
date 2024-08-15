import { ObjectId } from 'mongodb';

import { Maybe } from '~utils/types';

import { PageInfoMapper } from '../base/schema.mappers';
import {
  NoteCategory,
  NoteTextField,
  NotetextFieldsArgs,
  ResolverTypeWrapper,
  ResolversTypes,
} from '../types.generated';

import { CollabTextMapper } from '../collab/schema.mappers';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLResolversContext } from '../context';
import { PublicUserMapper } from '../user/schema.mappers';

export interface NoteMapper {
  noteId(): ResolverTypeWrapper<ObjectId>;
  noteIdStr(): ResolverTypeWrapper<string>;
  id(): ResolverTypeWrapper<string>;
  readOnly(): ResolverTypeWrapper<boolean>;
  createdAt(): ResolverTypeWrapper<Date>;
  textFields(args?: NotetextFieldsArgs): NoteTextFieldEntryMapper[];
  categoryName(): ResolverTypeWrapper<NoteCategory>;
  preferences(): NotePreferencesMapper;
  deletedAt(): Maybe<ResolverTypeWrapper<Date>>;
  users(
    ctx: GraphQLResolversContext,
    info: GraphQLResolveInfo
  ): ResolverTypeWrapper<NoteUserMapper[]>;
}

export interface NoteUserMapper {
  user(): PublicUserMapper;
  higherScope(): ResolverTypeWrapper<boolean>;
  readOnly(): ResolverTypeWrapper<boolean>;
}

export interface NoteTextFieldEntryMapper {
  readonly key: NoteTextField;
  readonly value: CollabTextMapper;
}

export interface NotePreferencesMapper {
  backgroundColor(): ResolverTypeWrapper<string>;
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

export interface DeletedNoteMapper {
  id(): ResolverTypeWrapper<string>;
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
