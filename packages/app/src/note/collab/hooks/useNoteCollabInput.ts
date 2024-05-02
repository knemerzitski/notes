import { FormEventHandler } from 'react';
import { NoteTextField } from '../../../__generated__/graphql';
import useEditor from '../../../collab/hooks/useEditor';
import useHTMLInputEditor from '../../../collab/hooks/useHTMLInputEditor';
import useSyncActiveSelection from '../../../collab/hooks/useSyncActiveSelection';
import useNoteCollabTextFieldId from './useNoteCollabTextId';

export default function useNoteCollabInput(
  noteContentId: string,
  fieldName: NoteTextField
) {
  const collabTextId = useNoteCollabTextFieldId(noteContentId, fieldName);
  const { viewText, ...editor } = useEditor(collabTextId);
  const { handleInput, handleSelect: htmlInputHandleSelect } = useHTMLInputEditor(editor);
  const { inputRef, handleSelect: syncHandleSelect } =
    useSyncActiveSelection(collabTextId);

  const handleSelect: FormEventHandler<HTMLInputElement> = (e) => {
    syncHandleSelect(e);
    htmlInputHandleSelect(e);
  };

  return {
    inputRef,
    viewText,
    handleInput,
    handleSelect,
  };
}
