import { CSSInterpolation } from '@emotion/serialize';
import { css } from '@mui/material';

export const popoverPaperStyle = (styles: CSSInterpolation) => css`
  .MuiPopover-paper {
    ${styles}
  }
`;
