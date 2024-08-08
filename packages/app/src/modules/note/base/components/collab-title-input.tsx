import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../../__generated__/graphql';
import { useNoteTextFieldHTMLInput } from '../../remote/context/note-text-field-editors-provider';

import { TitleInput } from './title-input';

export interface CollabTitleInputProps {
  inputProps?: InputProps;
}

export function CollabTitleInput({ inputProps }: CollabTitleInputProps) {
  const editorInput = useNoteTextFieldHTMLInput(NoteTextField.TITLE);

  return <TitleInput {...editorInput} {...inputProps} />;
}
