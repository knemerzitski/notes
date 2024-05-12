import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../__generated__/graphql';
import ContentInput from './ContentInput';
import { useNoteContentId } from '../../context/NoteContentIdProvider';
import useNoteTextFieldEditor from '../../hooks/useNoteTextFieldHTMLInputEditor';

export interface CollabContentInputProps {
  inputProps?: InputProps;
}

export default function CollabContentInput({ inputProps }: CollabContentInputProps) {
  const noteContentId = useNoteContentId();
  const editor = useNoteTextFieldEditor(noteContentId, NoteTextField.Content);

  return <ContentInput {...editor} {...inputProps} />;
}
