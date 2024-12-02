import { Box, TextField, CircularProgress, css, styled } from '@mui/material';
import { getShareUrl } from '../utils/get-share-url';
import { useFragment } from '@apollo/client';
import { useNoteId } from '../context/note-id';
import { useIsCreatingShareLink } from '../hooks/useIsCreatingShareLink';
import { gql } from '../../__generated__';
import { useSmoothValue } from '../../utils/hooks/useSmoothValue';

const SharingLinkTextField_NoteFragment = gql(`
  fragment SharingLinkTextField_NoteFragment on Note {
    shareAccess {
      id
    }
  }
`);

export function SharingLinkTextField() {
  const noteId = useNoteId();
  const { data: note } = useFragment({
    fragment: SharingLinkTextField_NoteFragment,
    from: {
      __typename: 'Note',
      id: noteId,
    },
  });

  const isCreatingShareLink = useSmoothValue(useIsCreatingShareLink(noteId));

  const sharingLink = getShareUrl(note.shareAccess?.id);

  return (
    <RootBoxStyled>
      <TextField
        variant="outlined"
        disabled
        value={isCreatingShareLink ? '' : sharingLink}
        fullWidth
      />
      {isCreatingShareLink && <CircularProgressStyled size={30} />}
    </RootBoxStyled>
  );
}

const RootBoxStyled = styled(Box)(css`
  position: relative;
  flex-grow: 1;
`);

const CircularProgressStyled = styled(CircularProgress)(css`
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
`);