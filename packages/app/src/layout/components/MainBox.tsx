import { css } from '@emotion/react';
import { Box, styled, Theme } from '@mui/material';

import { ReactNode } from 'react';

import { useIsMobile } from '../../theme/context/is-mobile';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

export function MainBox({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <MainBoxStyled component="main" isMobile={isMobile}>
      {children}
    </MainBoxStyled>
  );
}

const baseStyle = ({ theme }: { theme: Theme }) => css`
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: ${theme.spacing(5)};

  ${theme.breakpoints.up('xs')} {
    padding-left: ${theme.spacing(1)};
    padding-right: ${theme.spacing(1)};
  }

  ${theme.breakpoints.up('sm')} {
    padding-left: ${theme.spacing(2)};
    padding-right: ${theme.spacing(2)};
  }

  ${theme.breakpoints.up('md')} {
    padding-left: ${theme.spacing(3)};
    padding-right: ${theme.spacing(3)};
  }
`;

const mobileGap = {
  style: ({
    isMobile,
    theme,
  }: {
    isMobile?: boolean;
  } & { theme: Theme }) => {
    return css`
      gap: ${theme.spacing(isMobile ? 2 : 4)};
    `;
  },
  props: ['isMobile'],
};

const MainBoxStyled = styled(Box, {
  shouldForwardProp: mergeShouldForwardProp(mobileGap.props),
})<{
  isMobile?: boolean;
}>(baseStyle, mobileGap.style);
