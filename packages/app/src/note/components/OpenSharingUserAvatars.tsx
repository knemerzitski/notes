import { Tooltip, Box, css, styled } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

import { noteSharingDialogId } from '../../utils/element-id';
import { useNoteId } from '../context/note-id';
import { useIsNoteSharingOpen } from '../hooks/useIsNoteSharingOpen';

import {
  OpenedNoteUserAvatars,
  OpenedNoteUserAvatarsProps,
} from './OpenedNoteUserAvatars';

export function OpenSharingUserAvatars({
  OpenedNoteUserAvatarsProps,
}: {
  OpenedNoteUserAvatarsProps?: OpenedNoteUserAvatarsProps;
}) {
  const noteId = useNoteId();
  const navigate = useNavigate();

  const isNoteSharingOpen = useIsNoteSharingOpen(noteId);

  function handleClickNavigateToSharing() {
    void navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        sharingNoteId: noteId,
      }),
      mask: {
        to: '/note/sharing/$noteId',
        params: {
          noteId,
        },
      },
    });
  }

  return (
    <Tooltip title="Active Users">
      <Box>
        <OpenedNoteUserAvatarsStyled
          max={5}
          {...OpenedNoteUserAvatarsProps}
          aria-label="open note sharing dialog"
          aria-controls={isNoteSharingOpen ? noteSharingDialogId(noteId) : undefined}
          aria-expanded={isNoteSharingOpen}
          aria-haspopup={true}
          onClick={handleClickNavigateToSharing}
        />
      </Box>
    </Tooltip>
  );
}

const OpenedNoteUserAvatarsStyled = styled(OpenedNoteUserAvatars)(css`
  &:hover {
    cursor: pointer;
  }
`);
