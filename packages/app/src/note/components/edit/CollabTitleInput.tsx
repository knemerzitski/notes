import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../__generated__/graphql';
import TitleInput from './TitleInput';
import { useNoteTextFieldHTMLInput } from '../../context/NoteTextFieldEditorsProvider';

export interface CollabTitleInputProps {
  inputProps?: InputProps;
}

export default function CollabTitleInput({ inputProps }: CollabTitleInputProps) {
  const editorInput = useNoteTextFieldHTMLInput(NoteTextField.Title);

  return <TitleInput {...editorInput} {...inputProps} />;
}
