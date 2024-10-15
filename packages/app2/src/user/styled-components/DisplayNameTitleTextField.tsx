import styled from '@emotion/styled';
import { css, TextField } from '@mui/material';
import { boldStyle } from '../../utils/styles/bold';
import { largeFontStyle } from '../../utils/styles/large-font';

export const DisplayNameTitleTextField = styled(TextField)(css`
  .MuiInput-root {
    ${largeFontStyle}
    ${boldStyle}
  }
`);
