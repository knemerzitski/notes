import { InputProps } from '@mui/material';

import { useNoteContentId } from '../../context/NoteContentIdProvider';
import { NoteTextField } from '../../../../__generated__/graphql';
import ContentInput from '../../../components/edit/ContentInput';
import useNoteCollabInput from '../../hooks/useNoteCollabInput';

export interface CollabContentInputProps {
  inputProps?: InputProps;
}

export default function CollabContentInput({ inputProps }: CollabContentInputProps) {
  const noteContentId = useNoteContentId();
  const { inputRef, viewText, handleInput, handleSelect } = useNoteCollabInput(
    noteContentId,
    NoteTextField.Content
  );

  return (
    <ContentInput
      inputRef={inputRef}
      value={viewText}
      onInput={handleInput}
      onSelect={handleSelect}
      {...inputProps}
    />
  );
}
