import { Theme, css } from '@mui/material';

export const bigRoundedStyle = ({ theme }: { theme: Theme }) => css`
  padding-top: ${theme.spacing(2.5)};
  padding-bottom: ${theme.spacing(2.5)};
  border-radius: ${theme.shape.borderRadius * 3}px;
`;
