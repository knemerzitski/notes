import { Maybe } from '~utils/types';

import { PageInfoMapper } from '../base/schema.mappers';
import {
  NoteCategory,
  NoteSharing,
  NoteTextField,
  NotetextFieldsArgs,
  ResolverTypeWrapper,
  ResolversTypes,
} from '../types.generated';

import { NoteCollabTextQueryMapper } from './mongo-query-mapper/note-collab-text';

export interface NoteTextFieldEntryMapper {
  key(): ResolverTypeWrapper<NoteTextField>;
  value(): NoteCollabTextQueryMapper;
}

export interface NotePreferencesMapper {
  backgroundColor(): Promise<Maybe<string>>;
}

export interface NoteMapper {
  id(): ResolverTypeWrapper<string>;
  contentId(): ResolverTypeWrapper<string>;
  textFields(args?: NotetextFieldsArgs): NoteTextFieldEntryMapper[];
  readOnly(): ResolverTypeWrapper<boolean>;
  preferences(): NotePreferencesMapper;
  isOwner(): ResolverTypeWrapper<boolean>;
  sharing(): ResolverTypeWrapper<NoteSharing>;
  categoryName(): ResolverTypeWrapper<NoteCategory>;
}

export interface NotePatchMapper {
  id(): ResolverTypeWrapper<string>;
  textFields?: ResolversTypes['NoteTextFieldEntryPatch'][];
  preferences?: ResolversTypes['NotePreferencesPatch'];
  sharing?: ResolversTypes['NoteSharingPatch'];
  categoryName?: ResolversTypes['NoteCategory'];
}

export interface NoteConnectionMapper {
  notes(): ResolverTypeWrapper<NoteMapper[]>;
  edges(): ResolverTypeWrapper<NoteEdgeMapper[]>;
  pageInfo(): PageInfoMapper;
}

export interface NoteEdgeMapper {
  node(): NoteMapper;
  cursor(): ResolversTypes['Cursor'];
}
