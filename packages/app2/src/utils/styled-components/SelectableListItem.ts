import { ListItem, styled } from '@mui/material';
import { backgroundSelectable } from '../styles/background-selectable';
import { mergeShouldForwardProp } from '../merge-should-forward-prop';

export const SelectableListItem = styled(ListItem, {
  shouldForwardProp: mergeShouldForwardProp(backgroundSelectable.props),
})(backgroundSelectable.style);
