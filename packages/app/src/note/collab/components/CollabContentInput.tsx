import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../__generated__/graphql';
import BaseContent from '../../components/edit/ContentInput';
import useNoteField from '../hooks/useNoteField';

export interface ContentProps {
  inputProps?: InputProps;
}

export default function CollabContent({ inputProps }: ContentProps) {
  const { inputRef, value, handleSelect, handleInput } = useNoteField(
    NoteTextField.Content
  );

  return (
    <BaseContent
      inputRef={inputRef}
      value={value}
      onSelect={handleSelect}
      onInput={handleInput}
      {...inputProps}
    />
  );
}
