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
  id(): ResolverTypeWrapper<string>;
  noteId(): ResolverTypeWrapper<string>;
  contentId(): ResolverTypeWrapper<string>;
  textFields(args?: NotetextFieldsArgs): NoteTextFieldEntryMapper[];
  readOnly(): ResolverTypeWrapper<boolean>;
  preferences(): NotePreferencesMapper;
  isOwner(): ResolverTypeWrapper<boolean>;
  sharing(): ResolversTypes['NoteSharing'];
  categoryName(): ResolverTypeWrapper<NoteCategory>;
}

export interface NoteTextFieldEntryMapper {
  key(): ResolverTypeWrapper<NoteTextField>;
  value(): ResolverTypeWrapper<NoteCollabTextQueryMapper>;
}

export interface NotePreferencesMapper {
  backgroundColor(): ResolverTypeWrapper<string>;
}

export interface NotePatchMapper {
  id(): ResolverTypeWrapper<string>;
  contentId(): ResolverTypeWrapper<string>;
  textFields(): Maybe<ResolversTypes['NoteTextFieldEntryPatch'][]>;
  preferences(): NotePreferencesMapper;
  sharing(): ResolversTypes['NoteSharingPatch'];
  isOwner(): ResolverTypeWrapper<boolean>;
  readOnly(): ResolverTypeWrapper<boolean>;
  categoryName(): ResolverTypeWrapper<NoteCategory>;
}

export interface UpdateNotePayloadMapper {
  contentId(): ResolverTypeWrapper<string>;
  patch?(): Maybe<ResolverTypeWrapper<NotePatchMapper>>;
}

export interface NoteUpdatedPayloadMapper {
  contentId(): ResolverTypeWrapper<string>;
  patch?(): Maybe<ResolverTypeWrapper<NotePatchMapper>>;
}

export interface NoteConnectionMapper {
  notes(): ResolverTypeWrapper<NoteMapper[]>;
  edges(): ResolverTypeWrapper<NoteEdgeMapper[]>;
  pageInfo(): ResolverTypeWrapper<PageInfoMapper>;
}

export interface NoteEdgeMapper {
  node(): ResolverTypeWrapper<NoteMapper>;
  cursor(): ResolversTypes['Cursor'];
}

export interface DeleteNotePayloadMapper {
  id(): ResolverTypeWrapper<string>;
  contentId(): ResolverTypeWrapper<string>;
}

export interface NoteDeletedPayloadMapper {
  id(): ResolverTypeWrapper<string>;
  contentId(): ResolverTypeWrapper<string>;
}
