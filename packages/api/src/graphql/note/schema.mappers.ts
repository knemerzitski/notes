import { Maybe } from '~utils/types';
import {
  NoteSharing,
  NoteTextField,
  NotetextFieldsArgs,
  ResolverTypeWrapper,
  ResolversTypes,
} from '../types.generated';
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
  textFields(args?: NotetextFieldsArgs): NoteTextFieldEntryMapper[];
  readOnly(): ResolverTypeWrapper<Maybe<boolean>>;
  preferences(): NotePreferencesMapper;
  ownerId(): Promise<ObjectId | undefined>;
  sharing(): ResolverTypeWrapper<NoteSharing>;
}

export interface NotePatchMapper {
  id(): ResolverTypeWrapper<string>;
  textFields?: ResolversTypes['NoteTextFieldEntryPatch'][];
  preferences?: ResolversTypes['NotePreferencesPatch'];
  sharing?: ResolversTypes['NoteSharingPatch'];
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
