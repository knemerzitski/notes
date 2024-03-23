import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../__generated__/graphql';
import BaseContent from '../../components/edit/ContentInput';
import useNoteField from '../hooks/useNoteField';

export interface ContentProps {
  inputProps?: InputProps;
}

export default function CollabContent({ inputProps }: ContentProps) {
  const { inputRef, value, handleInput, handleSelect } = useNoteField(
    NoteTextField.Content
  );

  return (
    <BaseContent
      inputRef={inputRef}
      value={value}
      onInput={handleInput}
      onSelect={handleSelect}
      {...inputProps}
    />
  );
}
