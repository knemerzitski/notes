import { NoteTextFieldName } from '../__generated__/graphql';
import { createNoteExternalStateContext } from './utils/external-state';

export type NoteExternalState = ReturnType<
  ReturnType<
    typeof createNoteExternalStateContext<NoteTextFieldName>
  >['newValue']
>;

export type NoteTextFieldEditor = ReturnType<NoteExternalState['multiText']['getText']>;
