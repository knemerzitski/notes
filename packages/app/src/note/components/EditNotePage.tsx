import { Box, Toolbar, styled, css } from '@mui/material';

import { EditingHeaderToolbar } from '../../layout/components/EditingHeaderToolbar';
import { ScrollEndShadowAppBar } from '../../layout/components/ScrollEndShadowAppBar';

import { ToolbarScrollPaddingBottom } from '../../utils/components/ToolbarScrollPaddingBottom';
import { toolbarHeight } from '../../utils/toolbar-height';

import { CollabInputsColumn } from './CollabInputsColumn';
import { OpenSharingUserAvatars } from './OpenSharingUserAvatars';
import { ScrollEndShadowMobileNoteToolbar } from './ScrollEndShadowMobileNoteToolbar';

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

      <UserAvatarsBoxStyled>
        <OpenSharingUserAvatars
          OpenedNoteUserAvatarsProps={{
            max: 3,
            spacing: 'small',
            UserAvatarProps: {
              size: 'small',
            },
          }}
        />
      </UserAvatarsBoxStyled>
    </RootBoxStyled>
  );
}

const RootBoxStyled = styled(Box)(css`
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
`);

export const UserAvatarsBoxStyled = styled(Box)(
  ({ theme }) => css`
    position: absolute;

    right: ${theme.spacing(0.5)};

    ${theme.breakpoints.up('xs')} {
      top: ${theme.spacing(7.5)};
    }

    ${theme.breakpoints.up('sm')} {
      top: ${theme.spacing(8.5)};
    }
  `
);

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
