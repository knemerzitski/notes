import { Box, Toolbar, styled, css } from '@mui/material';
import { EditingHeaderToolbar } from '../../layout/components/EditingHeaderToolbar';
import { ScrollEndShadowAppBar } from '../../layout/components/ScrollEndShadowAppBar';
import { ScrollEndShadowMobileNoteToolbar } from './ScrollEndShadowMobileNoteToolbar';
import { CollabInputsColumn } from './CollabInputsColumn';
import { toolbarHeight } from '../../utils/toolbar-height';
import { ToolbarScrollPaddingBottom } from '../../utils/components/ToolbarScrollPaddingBottom';

export type EditNotePageProps = Parameters<typeof EditNotePage>[0];

export function EditNotePage({
  focus = false,
}: {
  /**
   * Focus content text field
   * @default false
   */
  focus?: boolean;
}) {
  return (
    <RootBoxStyled>
      <ScrollEndShadowAppBar>
        <EditingHeaderToolbar />
      </ScrollEndShadowAppBar>
      <Toolbar />

      <CollabInputsColumnStyled
        CollabInputsProps={{
          CollabContentInputProps: {
            slots: {
              root: ContentFillHeightStyled,
            },
            slotProps: {
              input: {
                autoFocus: focus,
              },
            },
          },
        }}
      />
      <ToolbarScrollPaddingBottom />
      <ScrollEndShadowMobileNoteToolbarStyled />
    </RootBoxStyled>
  );
}

const RootBoxStyled = styled(Box)(css`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
`);

const CollabInputsColumnStyled = styled(CollabInputsColumn)(
  ({ theme }) => css`
    padding-left: ${theme.spacing(1)};
    padding-right: ${theme.spacing(1)};
    flex-grow: 1;
    margin-bottom: ${toolbarHeight(theme)};
  `
);

const ContentFillHeightStyled = styled(Box)(`
  display: flex;
  flex-grow: 1;
`);

const ScrollEndShadowMobileNoteToolbarStyled = styled(ScrollEndShadowMobileNoteToolbar)(
  ({ theme }) => css`
    height: ${toolbarHeight(theme)};
  `
);
