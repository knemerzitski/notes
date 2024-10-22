import styled from '@emotion/styled';
import { css, Typography } from '@mui/material';

export const DisplayName = styled(Typography)(css`
  text-overflow: ellipsis;
  overflow: hidden;
  font-weight: bold;
`);
