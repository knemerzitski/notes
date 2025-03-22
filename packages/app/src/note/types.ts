import { createNoteExternalStateContext } from './utils/external-state';

export enum NoteTextFieldName {
  TITLE = 't',
  CONTENT = 'c',
}

export type NoteExternalState = ReturnType<
  ReturnType<typeof createNoteExternalStateContext<NoteTextFieldName>>['newValue']
>;

export type NoteTextFieldEditor = ReturnType<NoteExternalState['multiText']['getText']>;
