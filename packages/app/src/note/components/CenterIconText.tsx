import { Box, BoxProps, css, styled, Typography } from '@mui/material';
import { ReactNode } from 'react';

export function CenterIconText({
  icon,
  text,
  ...restProps
}: { icon: ReactNode; text: string } & BoxProps) {
  return (
    <BoxStyled {...restProps}>
      {icon}
      <Typography>{text}</Typography>
    </BoxStyled>
  );
}

const BoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    gap: ${theme.spacing(1)};

    color: ${theme.palette.grey['700']};

    & > .MuiSvgIcon-root {
      font-size: 80px;
    }

    & > .MuiTypography-root {
      font-weight: bold;
    }
  `
);
