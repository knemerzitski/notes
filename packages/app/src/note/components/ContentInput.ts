import { css, styled } from '@mui/material';
import { PlainInput } from '../../utils/components/PlainInput';

export const ContentInput = styled(PlainInput)(css`
  align-items: flex-start;
  flex-grow: 1;
`);

ContentInput.defaultProps = {
  placeholder: 'Note',
  multiline: true,
};
