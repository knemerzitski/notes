import { css, Theme } from '@mui/material';

// 0,09375 = 36/64

export function smallAvatarStyle({ theme }: { theme: Theme }) {
  return css`
    font-size: 14px;
    width: 28px;
    height: 28px;
    box-shadow: ${theme.shadows['1']};
  `;
}
