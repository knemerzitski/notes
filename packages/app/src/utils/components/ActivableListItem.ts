import { css, ListItem, styled, Theme } from '@mui/material';

import { mergeShouldForwardProp } from '../merge-should-forward-prop';

const backgroundColorActive = {
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

export const ActivableListItem = styled(ListItem, {
  shouldForwardProp: mergeShouldForwardProp(backgroundColorActive.props),
})<{ active?: boolean }>(backgroundColorActive.style);
