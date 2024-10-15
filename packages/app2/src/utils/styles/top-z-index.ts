import { css, Theme } from '@mui/material';

export function topZIndexStyle({ theme }: { theme: Theme }) {
  return css`
    z-index: ${theme.zIndex.top};
  `;
}
