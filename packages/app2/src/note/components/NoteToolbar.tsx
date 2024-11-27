import { css, AppBar, styled, Box, AppBarProps } from '@mui/material';
import { NoteAlwaysButtons } from './NoteAlwaysButtons';
import { EdgeEndCloseButton } from './EdgeEndCloseButton';
import { NoteEditingButtons } from './NoteEditingButtons';
import { NoteMoreOptionsButton } from './NoteMoreOptionsButton';

export function NoteToolbar(props: Omit<AppBarProps, 'position' | 'component'>) {
  return (
    <AppBarStyled {...props}>
      <SpaceBetweenBox>
        <ButtonsBox>
          <NoteAlwaysButtons />
          <NoteEditingButtons />
          <NoteMoreOptionsButton />
        </ButtonsBox>
        <EdgeEndCloseButton />
      </SpaceBetweenBox>
    </AppBarStyled>
  );
}

const AppBarStyled = styled(AppBar)({});

AppBarStyled.defaultProps = {
  //@ts-expect-error It does change component element
  component: 'div',
  elevation: 0,
  position: 'relative',
  color: 'default',
};

const SpaceBetweenBox = styled(Box)(css`
  display: flex;
  justify-content: space-between;
`);

const ButtonsBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    padding: ${theme.spacing(1)};
    gap: ${theme.spacing(1)};
  `
);
