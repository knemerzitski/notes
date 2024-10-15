import { css, Theme } from '@mui/material';

export function absoluteCornerStyle({ theme }: { theme: Theme }) {
  return css`
    position: absolute;
    right: ${theme.spacing(1)};
    top: ${theme.spacing(1)};
  `;
}
