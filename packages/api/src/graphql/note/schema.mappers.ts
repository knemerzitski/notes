import { Maybe } from '~utils/types';
import { NoteTextField, ResolverTypeWrapper, ResolversTypes } from '../types.generated';
import { CollabTextMapper } from '../collab/schema.mappers';
import { PageInfoMapper } from '../base/schema.mappers';

export interface NoteTextFieldEntryMapper {
  key(): ResolverTypeWrapper<NoteTextField>;
  value(): CollabTextMapper;
}

export interface NotePreferencesMapper {
  backgroundColor(): Promise<Maybe<string>>;
}

export interface NoteMapper {
  id(): ResolverTypeWrapper<string>;
  urlId(): ResolverTypeWrapper<string>;
  textFields(): NoteTextFieldEntryMapper[];
  readOnly(): ResolverTypeWrapper<Maybe<boolean>>;
  preferences(): NotePreferencesMapper;
}

export interface NoteConnectionMapper {
  edges(): NoteEdgeMapper[];
  pageInfo(): PageInfoMapper;
}

export interface NoteEdgeMapper {
  node(): NoteMapper;
  cursor(): ResolversTypes['Cursor'];
}
