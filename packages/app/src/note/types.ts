import {
  NoteExternalState as _NoteExternalState,
  NoteTextFieldEditor as _NoteTextFieldEditor,
} from './utils/external-state';

export enum NoteTextFieldName {
  TITLE = 't',
  CONTENT = 'c',
}

export type NoteExternalState = _NoteExternalState<NoteTextFieldName>;

export type NoteTextFieldEditor = _NoteTextFieldEditor;
