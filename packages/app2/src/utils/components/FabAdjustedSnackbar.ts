import { css, Snackbar, SnackbarProps, styled, Theme } from '@mui/material';
import { mergeShouldForwardProp } from '../merge-should-forward-prop';

const fabAdjustedStyle = {
  style: ({
    isRenderingFab,
    anchorOrigin = { vertical: 'bottom' },
    theme,
  }: {
    isRenderingFab: boolean;
    anchorOrigin?: Pick<NonNullable<SnackbarProps['anchorOrigin']>, 'vertical'>;
  } & { theme: Theme }) => {
    if (!isRenderingFab || anchorOrigin.vertical !== 'bottom') {
      return;
    }
    fabAdjustedStyle;

    return css`
      ${theme.breakpoints.up('xs')} {
        bottom: 90px;
      }
      ${theme.breakpoints.up('sm')} {
        bottom: 24px;
      }
    `;
  },
  props: ['isRenderingFab'],
};

export const FabAdjustedSnackbar = styled(Snackbar, {
  shouldForwardProp: mergeShouldForwardProp(fabAdjustedStyle.props),
})(fabAdjustedStyle.style);
