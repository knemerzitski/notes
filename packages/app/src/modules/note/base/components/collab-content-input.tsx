import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../../__generated__/graphql';
import { useNoteTextFieldHTMLInput } from '../../remote/context/note-text-field-editors-provider';

import { ContentInput } from './content-input';

export interface CollabContentInputProps {
  inputProps?: InputProps;
}

export function CollabContentInput({ inputProps }: CollabContentInputProps) {
  const editorInput = useNoteTextFieldHTMLInput(NoteTextField.CONTENT);

  return <ContentInput {...editorInput} {...inputProps} />;
}
