import { useNoteTextFieldName } from '../context/note-text-field-name';
import { NoteTextFieldEditor } from '../types';

import { useCollabFacade } from './useCollabFacade';

export function useNoteTextFieldEditor(): NoteTextFieldEditor {
  const collabFacade = useCollabFacade();
  const fieldName = useNoteTextFieldName();

  return collabFacade.fieldCollab.getField(fieldName);
}
