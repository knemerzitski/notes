import LinkIcon from '@mui/icons-material/Link';
import {
  Box,
  css,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  styled,
} from '@mui/material';
import { forwardRef } from 'react';

import { gql } from '../../__generated__';
import { TopCornerCloseButton } from '../../utils/components/TopCornerCloseButton';

import { SharingCopyLinkButton } from './SharingCopyLinkButton';
import { SharingLinkQRCode } from './SharingLinkQRCode';
import { SharingLinkTextField } from './SharingLinkTextField';
import { SharingStatusTypography } from './SharingStatusTypography';
import { ToggleSharingSwitch } from './ToggleSharingSwitch';

const _NoteSharingDialog_NoteFragment = gql(`
  fragment NoteSharingDialog_NoteFragment on Note {
    ...ToggleSharingSwitch_NoteFragment
    ...SharingStatusTypography_NoteFragment
    ...SharingLinkTextField_NoteFragment
    ...SharingCopyLinkButton_NoteFragment
    ...SharingLinkQRCode_NoteFragment
  }
`);

export const NoteSharingDialog = forwardRef<
  HTMLDivElement,
  Omit<Parameters<typeof DialogStyled>[0], 'onClose'> & { onClose?: () => void }
>(function NoteSharingDialog(
  { open = true, fullWidth = true, PaperProps, onClose, ...restProps },
  ref
) {
  function handleClickClose() {
    onClose?.();
  }

  return (
    <DialogStyled
      ref={ref}
      open={open}
      fullWidth={fullWidth}
      onClose={onClose}
      {...restProps}
      PaperProps={{
        variant: 'outlined',
        elevation: 0,
        ...PaperProps,
      }}
    >
      <DialogTitle>
        <DialogTitleBox>
          <LinkIcon />
          Share via link
        </DialogTitleBox>
      </DialogTitle>
      <TopCornerCloseButton
        aria-label="close sharing dialog"
        onClick={handleClickClose}
      />
      <DialogContent>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center">
            <ToggleSharingSwitch />
            <SharingStatusTypography />
          </Stack>

          <TextFieldButtonRow>
            <SharingLinkTextField />
            <SharingCopyLinkButton />
          </TextFieldButtonRow>

          <QRCodeRow>
            <SharingLinkQRCode />
          </QRCodeRow>

          <DialogContentText>
            Anyone with the link gains access to read and modify this note.
          </DialogContentText>
        </Stack>
      </DialogContent>
    </DialogStyled>
  );
});

const DialogStyled = styled(Dialog)(
  ({ theme }) => css`
    .MuiDialog-container > .MuiPaper-root {
      border-radius: ${theme.shape.borderRadius * 2}px;
      border: ${theme.palette.mode === 'light' ? 'transparent' : undefined};
      margin: ${theme.spacing(1)};
    }
  `
);

const DialogTitleBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `
);

const TextFieldButtonRow = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-direction: row;
    gap: ${theme.spacing(1)};

    ${theme.breakpoints.down('sm')} {
      flex-direction: column;
    }
  `
);

const QRCodeRow = styled(Box)(css`
  display: flex;
  flex-direction: row;
  justify-content: center;
`);
