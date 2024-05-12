import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../__generated__/graphql';
import TitleInput from './TitleInput';
import { useNoteContentId } from '../../context/NoteContentIdProvider';
import useNoteTextFieldEditor from '../../hooks/useNoteTextFieldHTMLInputEditor';

export interface CollabTitleInputProps {
  inputProps?: InputProps;
}

export default function CollabTitleInput({ inputProps }: CollabTitleInputProps) {
  const noteContentId = useNoteContentId();
  const editor = useNoteTextFieldEditor(noteContentId, NoteTextField.Title);

  return <TitleInput {...editor} {...inputProps} />;
}
