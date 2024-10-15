import { css, SnackbarProps, Theme } from '@mui/material';

export const fabAdjustedStyle = {
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
