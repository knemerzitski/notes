import { css, styled } from '@mui/material';
import { PlainInput } from '../../utils/components/PlainInput';

export const TitleInput = styled(PlainInput)(css`
  font-weight: bold;
`);

TitleInput.defaultProps = {
  placeholder: 'Title',
};
