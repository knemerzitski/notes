import { Avatar, styled } from '@mui/material';

import { mergeShouldForwardProp } from '../merge-should-forward-prop';
import { smallAvatarStyle } from '../styles/small-avatar';
import { textBackgroundColor } from '../styles/text-background-color';

export const SmallTextBackgroundAvatar = styled(Avatar, {
  shouldForwardProp: mergeShouldForwardProp(textBackgroundColor.props),
})(textBackgroundColor.style, smallAvatarStyle);
