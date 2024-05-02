import { InputProps } from '@mui/material';

import { NoteTextField } from '../../../../__generated__/graphql';
import TitleInput from '../../../components/edit/TitleInput';
import { useNoteContentId } from '../../context/NoteContentIdProvider';
import useNoteCollabInput from '../../hooks/useNoteCollabInput';

export interface CollabTitleInputProps {
  inputProps?: InputProps;
}

export default function CollabTitleInput({ inputProps }: CollabTitleInputProps) {
  const noteContentId = useNoteContentId();
  const { inputRef, viewText, handleInput, handleSelect } = useNoteCollabInput(
    noteContentId,
    NoteTextField.Title
  );

  return (
    <TitleInput
      inputRef={inputRef}
      value={viewText}
      onInput={handleInput}
      onSelect={handleSelect}
      {...inputProps}
    />
  );
}
