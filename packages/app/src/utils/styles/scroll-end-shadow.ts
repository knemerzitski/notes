import { css, Theme } from '@mui/material';

export const scrollEndShadow = {
  style: ({
    isScrollEnd = false,
    theme,
  }: { isScrollEnd?: boolean } & { theme: Theme }) => {
    if (!isScrollEnd) {
      return css`
        box-shadow: ${theme.shadowsNamed.scrollEnd};
      `;
    }

    return;
  },
  props: ['isScrollEnd'],
};
