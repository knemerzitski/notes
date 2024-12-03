import { Avatar, styled } from '@mui/material';

import { mergeShouldForwardProp } from '../merge-should-forward-prop';
import { largeAvatarStyle } from '../styles/large-avatar';
import { textBackgroundColor } from '../styles/text-background-color';

export const LargeTextBackgroundAvatar = styled(Avatar, {
  shouldForwardProp: mergeShouldForwardProp(textBackgroundColor.props),
})(textBackgroundColor.style, largeAvatarStyle);
