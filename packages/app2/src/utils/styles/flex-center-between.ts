import { css, Theme } from '@mui/material';

export function flexCenterBetweenStyle({ theme }: { theme: Theme }) {
  return css`
    display: flex;
    gap: ${theme.spacing(2)};
    align-items: center;
    justify-content: space-between;
  `;
}
