import { Box, css, styled } from '@mui/material';
import { userInfoRowStyle } from '../styles/user-info-row';

export const UserInfoTitleRow = styled(Box)(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(2)};
    margin-right: ${theme.spacing(4)};
  `,
  userInfoRowStyle
);
