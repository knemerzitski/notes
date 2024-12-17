import { css } from '@mui/material';

import { stringToColor } from '../string-to-color';

export const textBackgroundColor = {
  style: ({ bgColorText }: { bgColorText: string }) => {
    return css`
      background-color: ${stringToColor(bgColorText)};
    `;
  },
  props: ['bgColorText'],
};
