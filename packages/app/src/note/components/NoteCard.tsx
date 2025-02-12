import { useApolloClient } from '@apollo/client';
import { alpha, Box, css, Paper, PaperProps, styled, Theme } from '@mui/material';
import { forwardRef, ReactNode, useRef, useState } from 'react';

import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';
import { isDevToolsEnabled } from '../../dev/utils/dev-tools';
import { useIsMobile } from '../../theme/context/is-mobile';
import { noteEditDialogId } from '../../utils/element-id';
import { isElHover } from '../../utils/is-el-hover';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

import { useNoteId } from '../context/note-id';
import { useIsAnyNoteSelected } from '../hooks/useIsAnyNoteSelected';
import { useIsLocalOnlyNote } from '../hooks/useIsLocalOnlyNote';
import { useIsNoteOpen } from '../hooks/useIsNoteOpen';

import { useIsNoteSelected } from '../hooks/useIsNoteSelected';
import { useNavigateToNote } from '../hooks/useNavigateToNote';
import { useSelectNoteTrigger } from '../hooks/useSelectNoteTrigger';
import { getCategoryName } from '../models/note/category-name';

import { ContentTypography } from './ContentTypography';

import { DeletedInDays } from './DeletedInDays';

import { NoteAlwaysButtons } from './NoteAlwaysButtons';
import { NoteMoreOptionsButton } from './NoteMoreOptionsButton';
import { OpenedNoteUserAvatars } from './OpenedNoteUserAvatars';
import { TitleTypography } from './TitleTypography';
import { UserAvatarsCornerPosition } from './UserAvatarsCornerPosition';

const _NoteCard_UserNoteLinkFragment = gql(`
  fragment NoteCard_UserNoteLinkFragment on UserNoteLink {
    ...DeletedInDays_UserNoteLinkFragment
    ...NoteMoreOptionsButton_UserNoteLinkFragment
    note {
      ...TitleTypography_NoteFragment
      ...ContentTypography_NoteFragment
      ...OpenedNoteUserAvatars_NoteFragment
    }
  }
`);

export const NoteCard = forwardRef<HTMLDivElement, PaperProps>(
  function NoteCard(props, ref) {
    const noteId = useNoteId();
    const localOnly = useIsLocalOnlyNote();

    const client = useApolloClient();
    const paperElRef = useRef<HTMLDivElement | null>(null);

    const navigateToNote = useNavigateToNote();

    const isNoteOpen = useIsNoteOpen(noteId);

    const selectNoteTrigger = useSelectNoteTrigger(noteId);
    const isAnyNoteSelected = useIsAnyNoteSelected();

    // Paper is active when hovering or more options menu is open
    const [isActive, setIsActive] = useState(false);

    if (isNoteOpen) {
      // Hide card when note is opened in a dialog
      return (
        <Box
          aria-label="hidden opened note"
          aria-controls={noteEditDialogId(noteId)}
          aria-expanded={true}
          {...props}
        />
      );
    }

    function isPaperHover() {
      const el = paperElRef.current;
      if (!el) {
        return false;
      }

      return isElHover(el);
    }

    const handleClick: PaperProps['onClick'] = (e) => {
      if (selectNoteTrigger.getIsControlled()) {
        return;
      }

      props.onClick?.(e);

      if (getCategoryName({ noteId }, client.cache) === NoteCategory.TRASH) {
        // Prevent editing trashed note
        return;
      }

      // Don't open note when any note is selected
      if (isAnyNoteSelected) {
        return;
      }

      void navigateToNote(noteId).finally(() => {
        updateIsActive();
      });
    };

    const handlePointerDown: PaperProps['onPointerDown'] = (e) => {
      selectNoteTrigger.onPointerDown(e);
    };

    const handlePointerMove: PaperProps['onPointerMove'] = (e) => {
      selectNoteTrigger.onPointerMove(e);
    };

    const handlePointerUp: PaperProps['onPointerUp'] = (e) => {
      selectNoteTrigger.onPointerUp(e);
    };

    const handleMouseEnter: PaperProps['onMouseEnter'] = (e) => {
      props.onMouseEnter?.(e);
      setIsActive(true);
    };

    const handleMouseLeave: PaperProps['onMouseLeave'] = (e) => {
      props.onMouseLeave?.(e);
      setIsActive(false);
    };

    function updateIsActive() {
      requestAnimationFrame(() => {
        setIsActive(isPaperHover());
      });
    }

    function handleExitedMoreOptionsMenu() {
      updateIsActive();
    }

    return (
      <PureNoteCard
        ref={(el) => {
          if (typeof ref === 'function') {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
          paperElRef.current = el;
        }}
        aria-label="open note dialog"
        data-note-id={noteId}
        data-is-local={localOnly}
        aria-haspopup={true}
        {...props}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        active={isActive}
        slots={{
          toolbar: (
            <>
              <NoteAlwaysButtons />
              <NoteMoreOptionsButton
                IconButtonMenuProps={{
                  slotProps: {
                    iconButton: {
                      edge: 'end',
                    },
                    menu: {
                      onTransitionExited: handleExitedMoreOptionsMenu,
                    },
                  },
                }}
              />
            </>
          ),
        }}
        slotProps={{
          toolbar: {
            active: isActive && !isAnyNoteSelected,
          },
        }}
      />
    );
  }
);

/**
 * NoteCard without complex rerender logic. Used as drag and drop component.
 */
export const PureNoteCard = forwardRef<
  HTMLDivElement,
  Parameters<typeof PaperStyled>[0] & {
    slots?: {
      toolbar?: ReactNode;
    };
    slotProps?: {
      toolbar: Parameters<typeof ToolbarBox>[0];
    };
  }
>(function PureNoteCard(
  { slots, slotProps, elevation = 0, variant = 'outlined', ...restProps },
  ref
) {
  const isMobile = useIsMobile();
  const noteId = useNoteId();
  const isSelected = useIsNoteSelected(noteId);

  const isToolbarActive = slotProps?.toolbar.active ?? false;

  const hasToolbarBeenActiveRef = useRef(isToolbarActive);
  hasToolbarBeenActiveRef.current = hasToolbarBeenActiveRef.current || isToolbarActive;

  const isRenderingToolbar = hasToolbarBeenActiveRef.current;

  return (
    <PaperStyled
      selected={isSelected}
      renderingToolbar={!isMobile}
      {...restProps}
      elevation={elevation}
      variant={variant}
      ref={ref}
    >
      {isDevToolsEnabled() && noteId}
      <UserAvatarsCornerPosition>
        <OpenedNoteUserAvatars
          max={3}
          spacing="small"
          UserAvatarProps={{
            size: 'small',
          }}
        />
      </UserAvatarsCornerPosition>
      <TitleTypography />
      <ContentTypography
        bottomGradient={{
          color: (theme) => theme.palette.background.paper,
          height: 2,
        }}
      />
      <DeletedInDaysStyled />
      {!isMobile && (
        <ToolbarBox {...slotProps?.toolbar}>
          {isRenderingToolbar && slots?.toolbar}
        </ToolbarBox>
      )}
    </PaperStyled>
  );
});

function baseStyle({ theme }: { theme: Theme }) {
  return css`
    position: relative;
    display: flex;
    flex-direction: column;
    padding-left: ${theme.spacing(2)};
    padding-right: ${theme.spacing(2)};
    padding-top: ${theme.spacing(2)};
    padding-bottom: ${theme.spacing(1)};
    border-radius: ${theme.shape.borderRadius * 2}px;
    gap: ${theme.spacing(2)};
    height: 100%;
    width: 100%;
    user-select: none;
  `;
}

const basePaddingBottom = {
  style: ({
    renderingToolbar = false,
    theme,
  }: { renderingToolbar?: boolean } & { theme: Theme }) => {
    return css`
      padding-bottom: ${theme.spacing(renderingToolbar ? 1 : 2)};
    `;
  },
  props: ['renderingToolbar'],
};

const baseActive = {
  style: ({ active = false, theme }: { active?: boolean } & { theme: Theme }) => {
    if (!active) {
      return;
    }

    return css`
      cursor: default;
      box-shadow: ${theme.shadows['1']};
    `;
  },
  props: ['active'],
};

const darkModeActive = {
  style: ({ active = false, theme }: { active?: boolean } & { theme: Theme }) => {
    if (!active || theme.palette.mode !== 'dark') {
      return;
    }

    return css`
      border-color: ${alpha(theme.palette.divider, theme.palette.dividerHoverOpacity)};
    `;
  },
  props: ['active'],
};

const selected = {
  style: ({ selected = false, theme }: { selected?: boolean } & { theme: Theme }) => {
    if (!selected) {
      return;
    }

    return css`
      border-color: transparent;
      outline: 2px solid ${theme.palette.primary.main};
      outline-offset: -1px;
    `;
  },
  props: ['selected'],
};

const PaperStyled = styled(Paper, {
  shouldForwardProp: mergeShouldForwardProp(
    basePaddingBottom.props,
    baseActive.props,
    darkModeActive.props,
    selected.props
  ),
})<{ active?: boolean; selected?: boolean; renderingToolbar?: boolean }>(
  baseStyle,
  basePaddingBottom.style,
  baseActive.style,
  darkModeActive.style,
  selected.style
);

const toolbarActive = {
  style: ({ active = false }: { active?: boolean }) => css`
    opacity: ${active ? 1 : 0};
  `,
  props: ['active'],
};

const ToolbarBox = styled(Box, {
  shouldForwardProp: mergeShouldForwardProp(toolbarActive.props),
})(
  ({ theme }) => css`
    display: flex;
    justify-content: flex-end;
    transition: ${theme.transitions.create(['opacity'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.shortest,
    })};
    gap: ${theme.spacing(1)};
    min-height: ${theme.spacing(5)};
  `,
  toolbarActive.style
);

const DeletedInDaysStyled = styled(DeletedInDays)(
  ({ theme }) => css`
    position: absolute;
    right: ${theme.spacing(0.5)};
    top: 0px;
    font-size: 0.8em;
    letter-spacing: 1.2px;
  `
);
