import { Maybe } from '~utils/types';
import { NoteTextField, ResolverTypeWrapper } from '../types.generated';
import { CollaborativeDocumentMapper } from '../collab/schema.mappers';

export interface NoteTextFieldEntryMapper {
  key(): ResolverTypeWrapper<NoteTextField>;
  value(): CollaborativeDocumentMapper;
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
