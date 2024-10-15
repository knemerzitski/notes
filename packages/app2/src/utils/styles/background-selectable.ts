import { css, Theme } from '@mui/material';

export const backgroundSelectable = {
  style: ({
    active,
    theme,
  }: {
    active?: boolean;
  } & { theme: Theme }) => {
    if (!active) {
      return;
    }

    return css`
      background-color: ${theme.palette.action.selected};
    `;
  },
  props: ['active'],
};
