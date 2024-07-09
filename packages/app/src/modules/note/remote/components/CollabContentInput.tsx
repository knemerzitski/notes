import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../../__generated__/graphql';
import { useNoteTextFieldHTMLInput } from '../context/NoteTextFieldEditorsProvider';

import ContentInput from './ContentInput';

export interface CollabContentInputProps {
  inputProps?: InputProps;
}

export default function CollabContentInput({ inputProps }: CollabContentInputProps) {
  const editorInput = useNoteTextFieldHTMLInput(NoteTextField.Content);

  return <ContentInput {...editorInput} {...inputProps} />;
}
