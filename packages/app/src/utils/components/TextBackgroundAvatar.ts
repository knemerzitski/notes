import { Avatar, styled } from '@mui/material';
import { mergeShouldForwardProp } from '../merge-should-forward-prop';
import { textBackgroundColor } from '../styles/text-background-color';

export const TextBackgroundAvatar = styled(Avatar, {
  shouldForwardProp: mergeShouldForwardProp(textBackgroundColor.props),
})(textBackgroundColor.style);
