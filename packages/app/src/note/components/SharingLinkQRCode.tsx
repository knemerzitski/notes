import { useFragment } from '@apollo/client';

import { Box, Collapse, css, styled } from '@mui/material';
import QRCode from 'react-qr-code';

import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { getShareUrl } from '../utils/get-share-url';
import { useRef } from 'react';

const SharingLinkQRCode_NoteFragment = gql(`
  fragment SharingLinkQRCode_NoteFragment on Note {
    id
    shareAccess {
      id
    }
  }
`);

export function SharingLinkQRCode() {
  const prevSharingLinkRef = useRef<string | null>(null);

  const noteId = useNoteId();
  const { data: note } = useFragment({
    fragment: SharingLinkQRCode_NoteFragment,
    from: {
      __typename: 'Note',
      id: noteId,
    },
  });

  function calcState() {
    if (!note.shareAccess) {
      if (prevSharingLinkRef.current) {
        return {
          link: prevSharingLinkRef.current,
          collapseIn: false,
        };
      }

      return {
        collapseIn: false,
      };
    }

    const sharingLink = getShareUrl(note.shareAccess.id);

    prevSharingLinkRef.current = sharingLink;

    return {
      link: sharingLink,
      collapseIn: true,
    };
  }

  const { link, collapseIn } = calcState();

  return (
    <Collapse in={collapseIn}>
      <WrapperBox>{link && <QRCode value={link} size={164} />}</WrapperBox>
    </Collapse>
  );
}

const WrapperBox = styled(Box)(
  ({ theme }) => css`
    border: ${theme.spacing(2)} solid ${theme.palette.common.white};
    border-radius: ${theme.shape.borderRadius * 1}px;
    box-shadow: ${theme.shadows[2]};
  `
);
