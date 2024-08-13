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

import { NoteCollabTextQueryMapper } from './mongo-query-mapper/note-collab-text';

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
  sharing(): ResolversTypes['NoteSharing'];
}

export interface NoteTextFieldEntryMapper {
  key(): ResolverTypeWrapper<NoteTextField>;
  value(): ResolverTypeWrapper<NoteCollabTextQueryMapper>;
}

export interface NotePreferencesMapper {
  backgroundColor(): ResolverTypeWrapper<string>;
}

export interface NotePreferencesPatchMapper {
  backgroundColor?(): ResolverTypeWrapper<string>;
}

export interface NotePatchMapper {
  id(): ResolverTypeWrapper<string>;
  textFields?(): Maybe<ResolversTypes['NoteTextFieldEntryPatch'][]>;
  categoryName?(): ResolverTypeWrapper<NoteCategory>;
  preferences?(): NotePreferencesPatchMapper;
  location?(): ResolversTypes['NoteLocation'];
  deletedAt?(): ResolverTypeWrapper<Date>;
  sharing?(): ResolversTypes['NoteSharingPatch'];
}

export interface DeletedNoteMapper {
  id(): ResolverTypeWrapper<string>;
}

export interface NotesConnectionMapper {
  notes(): ResolverTypeWrapper<NoteMapper[]>;
  edges(): ResolverTypeWrapper<NoteEdgeMapper[]>;
  pageInfo(): ResolverTypeWrapper<PageInfoMapper>;
}

export interface NoteEdgeMapper {
  node(): ResolverTypeWrapper<NoteMapper>;
  cursor(): ResolversTypes['Cursor'];
}
