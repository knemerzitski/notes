import styled from '@emotion/styled';
import { css, TextField } from '@mui/material';

import { displayNameTitleStyle } from '../styles/display-name-title';

export const DisplayNameTitleTextField = styled(TextField)(css`
  .MuiInput-root {
    ${displayNameTitleStyle}
    font-weight: bold;
  }
`);
