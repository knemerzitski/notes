import { css, Theme } from '@mui/material';

export function emphasisShapeStyle({ theme }: { theme: Theme }) {
  return css`
    font-size: 0.7rem;
    line-height: 0.7rem;
    background-color: rgba(0, 0, 0, 0.15);
    border-radius: ${theme.shape.borderRadius}px;
    padding: ${theme.spacing(0.75)};
  `;
}
