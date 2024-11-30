import { alpha, Box, css, Paper, PaperProps, styled, Theme } from '@mui/material';
import { forwardRef, ReactNode, useRef, useState } from 'react';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { isElHover } from '../../utils/is-el-hover';
import { TitleTypography } from './TitleTypography';
import { ContentTypography } from './ContentTypography';
import { useNavigate } from '@tanstack/react-router';
import { useNoteId } from '../context/note-id';
import { useIsNoteOpen } from '../hooks/useIsNoteOpen';
import { NoteMoreOptionsButton } from './NoteMoreOptionsButton';
import { NoteCategory } from '../../__generated__/graphql';
import { getCategoryName } from '../models/note/category-name';
import { useApolloClient } from '@apollo/client';
import { DeletedInDays } from './DeletedInDays';
import { gql } from '../../__generated__';
import { NoteAlwaysButtons } from './NoteAlwaysButtons';
import { noteEditDialogId } from '../../utils/element-id';

const _NoteCard_UserNoteLinkFragment = gql(`
  fragment NoteCard_UserNoteLinkFragment on UserNoteLink {
    ...DeletedInDays_UserNoteLinkFragment
    ...NoteMoreOptionsButton_UserNoteLinkFragment
    note {
      ...TitleTypography_NoteFragment
      ...ContentTypography_NoteFragment
    }
  }
`);

export const NoteCard = forwardRef<HTMLDivElement, PaperProps>(
  function NoteCard(props, ref) {
    const noteId = useNoteId();
    const client = useApolloClient();
    const paperElRef = useRef<HTMLDivElement | null>(null);

    const navigate = useNavigate();

    const isNoteOpen = useIsNoteOpen(noteId);

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
      props.onClick?.(e);

      if (getCategoryName({ noteId }, client.cache) === NoteCategory.TRASH) {
        // Prevent editing trashed note
        return;
      }

      // TODO depends if mobile or not when shows dialog
      void navigate({
        to: '.',
        search: {
          noteId,
        },
        mask: {
          to: '/note/$noteId',
          params: {
            noteId,
          },
        },
      }).finally(() => {
        updateIsActive();
      });
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
        aria-haspopup={true}
        {...props}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        active={isActive}
        slots={{
          suffix: (
            <ToolbarBox active={isActive}>
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
            </ToolbarBox>
          ),
        }}
      />
    );
  }
);

export const PureNoteCard = forwardRef<
  HTMLDivElement,
  Parameters<typeof PaperStyled>[0] & {
    slots?: {
      prefix?: ReactNode;
      suffix?: ReactNode;
    };
  }
>(function PureNoteCard(
  { slots, elevation = 0, variant = 'outlined', ...restProps },
  ref
) {
  const noteId = useNoteId();
  return (
    <PaperStyled {...restProps} elevation={elevation} variant={variant} ref={ref}>
      {slots?.prefix}
      {/* TODO create badge */}
      {import.meta.env.DEV && noteId}
      <TitleTypography />
      <ContentTypography />
      <DeletedInDaysStyled />
      {slots?.suffix}
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

const PaperStyled = styled(Paper, {
  shouldForwardProp: mergeShouldForwardProp(baseActive.props, darkModeActive.props),
})<{ active?: boolean }>(baseStyle, baseActive.style, darkModeActive.style);

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
