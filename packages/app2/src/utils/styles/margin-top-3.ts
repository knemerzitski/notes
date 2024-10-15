import { css, Theme } from '@mui/material';

export function marginTop3({ theme }: { theme: Theme }) {
  return css`
    margin-top: ${theme.spacing(3)};
  `;
}
