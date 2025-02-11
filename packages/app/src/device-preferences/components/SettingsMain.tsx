import { Box, css, styled } from '@mui/material';

import { ColorModeFormControl } from './ColorModeFormControl';
import { LayoutModeFormControl } from './LayoutModeFormControl';

export function SettingsMain() {
  return (
    <BoxStyled>
      <LayoutModeFormControl />
      <ColorModeFormControl />
    </BoxStyled>
  );
}

const BoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    width: 100%;
    flex-flow: column nowrap;
    gap: ${theme.spacing(1)};
  `
);
