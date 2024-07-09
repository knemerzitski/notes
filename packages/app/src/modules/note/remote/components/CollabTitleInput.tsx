import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../../__generated__/graphql';
import { useNoteTextFieldHTMLInput } from '../context/NoteTextFieldEditorsProvider';

import TitleInput from './TitleInput';

export interface CollabTitleInputProps {
  inputProps?: InputProps;
}

export default function CollabTitleInput({ inputProps }: CollabTitleInputProps) {
  const editorInput = useNoteTextFieldHTMLInput(NoteTextField.Title);

  return <TitleInput {...editorInput} {...inputProps} />;
}
