import { Avatar, css, styled } from '@mui/material';

import { mergeShouldForwardProp } from '../merge-should-forward-prop';

export const ColoredAvatar = styled(Avatar, {
  shouldForwardProp: mergeShouldForwardProp(['bgColor']),
})(({ bgColor }: { bgColor: string }) => {
  return css`
    background-color: ${bgColor};
  `;
});
