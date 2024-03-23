import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../__generated__/graphql';
import Title from '../../components/edit/TitleInput';
import useNoteField from '../hooks/useNoteField';

export interface ContentProps {
  inputProps?: InputProps;
}

export default function CollabTitle({ inputProps }: ContentProps) {
  const { inputRef, value, handleInput, handleSelect } = useNoteField(
    NoteTextField.Title
  );

  return (
    <Title
      inputRef={inputRef}
      value={value}
      onInput={handleInput}
      onSelect={handleSelect}
      {...inputProps}
    />
  );
}
