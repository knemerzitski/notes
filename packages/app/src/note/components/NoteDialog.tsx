import { css, Dialog, styled } from '@mui/material';

import { forwardRef } from 'react';

import { useIsElementScrollEnd } from '../../utils/hooks/useIsElementScrollEnd';

import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { scrollEndShadow } from '../../utils/styles/scroll-end-shadow';

import { CollabInputsColumn } from './CollabInputsColumn';
import { NoteToolbar } from './NoteToolbar';
import { OpenSharingUserAvatars } from './OpenSharingUserAvatars';
import { UserAvatarsCornerPosition } from './UserAvatarsCornerPosition';

export const NoteDialog = forwardRef<HTMLDivElement, Parameters<typeof DialogStyled>[0]>(
  function NoteDialog(
    { open = true, maxWidth = 'sm', fullWidth = true, PaperProps, ...restProps },
    ref
  ) {
    const { isScrollEnd = true, ref: collabInputsColumnRef } =
      useIsElementScrollEnd<HTMLDivElement>();

    return (
      <DialogStyled
        ref={ref}
        open={open}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        PaperProps={{
          variant: 'outlined',
          elevation: 0,
          ...PaperProps,
        }}
        closeAfterTransition={true}
        {...restProps}
      >
        <UserAvatarsCornerPosition>
          <OpenSharingUserAvatars />
        </UserAvatarsCornerPosition>
        <CollabInputsColumn ref={collabInputsColumnRef} />
        <NoteToolbarStyled isScrollEnd={isScrollEnd} />
      </DialogStyled>
    );
  }
);

const DialogStyled = styled(Dialog)(
  ({ theme }) => css`
    .MuiDialog-container > .MuiPaper-root {
      border-radius: ${theme.shape.borderRadius * 2}px;
      border: ${theme.palette.mode === 'light' ? 'transparent' : undefined};
      overflow: unset;
    }
  `
);

const NoteToolbarStyled = styled(NoteToolbar, {
  shouldForwardProp: mergeShouldForwardProp(scrollEndShadow.props),
})<{ isScrollEnd?: boolean }>(scrollEndShadow.style);
