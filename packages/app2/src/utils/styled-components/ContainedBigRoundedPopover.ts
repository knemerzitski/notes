import { Popover, styled } from '@mui/material';
import { bigRoundedStyle } from '../styles/big-rounded';
import { containedWidthStyle } from '../styles/contained-width';
import { popoverPaperStyle } from '../styles/popover-paper';

export const ContainedBigRoundedPopover = styled(Popover)((...props) =>
  popoverPaperStyle([bigRoundedStyle(...props), containedWidthStyle])
);
