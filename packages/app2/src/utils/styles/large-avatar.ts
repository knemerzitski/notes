import { css, Theme } from '@mui/material';

export function largeAvatarStyle({ theme }: { theme: Theme }) {
  return css`
    font-size: 36px;
    width: 64px;
    height: 64px;
    box-shadow: ${theme.shadows['3']};
  `;
}
