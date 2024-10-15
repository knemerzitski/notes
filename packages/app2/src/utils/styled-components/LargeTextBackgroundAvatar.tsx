import { Avatar, styled } from '@mui/material';
import { mergeShouldForwardProp } from '../merge-should-forward-prop';
import { textBackgroundColor } from '../styles/text-background-color';
import { largeAvatarStyle } from '../styles/large-avatar';

export const LargeTextBackgroundAvatar = styled(Avatar, {
  shouldForwardProp: mergeShouldForwardProp(textBackgroundColor.props),
})(textBackgroundColor.style, largeAvatarStyle);
