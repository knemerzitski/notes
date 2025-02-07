import { useFragment } from '@apollo/client';

import { Box, css, styled } from '@mui/material';
import QRCode from 'react-qr-code';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { getShareUrl } from '../utils/get-share-url';

const SharingLinkQRCode_NoteFragment = gql(`
  fragment SharingLinkQRCode_NoteFragment on Note {
    id
    shareAccess {
      id
    }
  }
`);

export function SharingLinkQRCode() {
  const noteId = useNoteId();
  const { data: note } = useFragment({
    fragment: SharingLinkQRCode_NoteFragment,
    from: {
      __typename: 'Note',
      id: noteId,
    },
  });

  if (!note.shareAccess) {
    return null;
  }

  const sharingLink = getShareUrl(note.shareAccess.id);

  return (
    <WrapperBox>
      <QRCode value={sharingLink} size={164} />
    </WrapperBox>
  );
}

const WrapperBox = styled(Box)(
  ({ theme }) => css`
    border: ${theme.spacing(2)} solid ${theme.palette.common.white};
    border-radius: ${theme.shape.borderRadius * 1}px;
    box-shadow: ${theme.shadows[2]};
  `
);
