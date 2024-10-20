import { Snackbar, styled } from '@mui/material';
import { mergeShouldForwardProp } from '../merge-should-forward-prop';
import { fabAdjustedStyle } from '../styles/fab-adjusted-style';

export const FabAdjustedSnackbar = styled(Snackbar, {
  shouldForwardProp: mergeShouldForwardProp(fabAdjustedStyle.props),
})(fabAdjustedStyle.style);
