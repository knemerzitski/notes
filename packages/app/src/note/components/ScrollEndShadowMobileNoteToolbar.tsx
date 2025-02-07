import { css, styled } from '@mui/material';
import { forwardRef } from 'react';

import { useIsScrollEnd } from '../../utils/hooks/useIsScrollEnd';

import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { scrollEndShadow } from '../../utils/styles/scroll-end-shadow';

import { MobileNoteToolbar } from './MobileNoteToolbar';

export const ScrollEndShadowMobileNoteToolbar = forwardRef<
  HTMLDivElement,
  Parameters<typeof MobileNoteToolbar>[0]
>(function ScrollEndShadowMobileNoteToolbar(props, ref) {
  const isScrollEnd = useIsScrollEnd();

  return <MobileNoteToolbarStyled {...props} ref={ref} isScrollEnd={isScrollEnd} />;
});

const MobileNoteToolbarStyled = styled(MobileNoteToolbar, {
  shouldForwardProp: mergeShouldForwardProp(scrollEndShadow.props),
})<{ isScrollEnd?: boolean }>(
  css`
    position: fixed;
    top: auto;
    bottom: 0;
    width: 100%;
  `,
  scrollEndShadow.style
);
