import { useFragment } from '@apollo/client';

import { Box, css, styled, Theme } from '@mui/material';
import QRCode from 'react-qr-code';

import { gql } from '../../__generated__';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
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

  const isDisabled = note.shareAccess == null;

  const sharingLink = note.shareAccess
    ? getShareUrl(note.shareAccess.id)
    : location.origin;

  return (
    <WrapperBox disabled={isDisabled}>
      <QRCode value={sharingLink} size={164} />
    </WrapperBox>
  );
}

export const disabled = {
  style: ({ disabled = false, theme }: { disabled?: boolean } & { theme: Theme }) => {
    if (!disabled) {
      return css`
        box-shadow: ${theme.shadows[2]};
      `;
    }

    return css`
      opacity: 0.25;
    `;
  },
  props: ['disabled'],
};

const WrapperBox = styled(Box, {
  shouldForwardProp: mergeShouldForwardProp(disabled.props),
})<{ disabled?: boolean }>(
  ({ theme }) => css`
    border: ${theme.spacing(2)} solid ${theme.palette.common.white};
    border-radius: ${theme.shape.borderRadius * 1}px;
    transition: ${theme.transitions.create(['opacity', 'box-shadow'], {
      duration: theme.transitions.duration.standard,
    })};
  `,
  disabled.style
);
