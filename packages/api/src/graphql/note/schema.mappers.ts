import { Maybe } from '~utils/types';
import { NoteTextField, ResolverTypeWrapper, ResolversTypes } from '../types.generated';
import { CollabTextMapper } from '../collab/schema.mappers';
import { PageInfoMapper } from '../base/schema.mappers';
import { ObjectId } from 'mongodb';

export interface NoteTextFieldEntryMapper {
  key(): ResolverTypeWrapper<NoteTextField>;
  value(): CollabTextMapper;
}

export interface NotePreferencesMapper {
  backgroundColor(): Promise<Maybe<string>>;
}

export interface NoteMapper {
  id(): ResolverTypeWrapper<string>;
  contentId(): ResolverTypeWrapper<string>;
  textFields(): NoteTextFieldEntryMapper[];
  readOnly(): ResolverTypeWrapper<Maybe<boolean>>;
  preferences(): NotePreferencesMapper;
  ownerId(): Promise<ObjectId | undefined>;
}

export interface NotePatchMapper {
  id(): ResolverTypeWrapper<string>;
  textFields?: ResolversTypes['NoteTextFieldEntryPatch'][];
  preferences?: ResolversTypes['NotePreferencesPatch'];
}

export interface NoteConnectionMapper {
  notes(): NoteMapper[];
  edges(): NoteEdgeMapper[];
  pageInfo(): PageInfoMapper;
}

export interface NoteEdgeMapper {
  node(): NoteMapper;
  cursor(): ResolversTypes['Cursor'];
}
