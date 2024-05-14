import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../__generated__/graphql';
import ContentInput from './ContentInput';
import { useNoteTextFieldHTMLInput } from '../context/NoteTextFieldEditorsProvider';

export interface CollabContentInputProps {
  inputProps?: InputProps;
}

export default function CollabContentInput({ inputProps }: CollabContentInputProps) {
  const editorInput = useNoteTextFieldHTMLInput(NoteTextField.Content);

  return <ContentInput {...editorInput} {...inputProps} />;
}
