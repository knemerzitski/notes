import { css, Theme } from '@mui/material';

export const drawerPaddingStyle = ({ theme }: { theme: Theme }) => {
  const px_xs = theme.spacing(0.5);
  const px_sm = theme.spacing(1.5);

  return css`
    ${theme.breakpoints.up('xs')} {
      padding-left: ${px_xs};
      padding-right: ${px_xs};
    }
    ${theme.breakpoints.up('sm')} {
      padding-left: ${px_sm};
      padding-right: ${px_sm};
    }
  `;
};
