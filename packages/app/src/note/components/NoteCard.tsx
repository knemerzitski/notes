import { useApolloClient } from '@apollo/client';
import {
  alpha,
  Box,
  CircularProgress,
  css,
  Paper,
  PaperProps,
  styled,
  Theme,
  Tooltip,
} from '@mui/material';
import { forwardRef, memo, useCallback, useMemo, useRef, useState } from 'react';

import { gql } from '../../__generated__';
import { NoteCategory } from '../../__generated__/graphql';
import { IsDesktop } from '../../utils/components/IsDesktop';
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
import { IsLoading } from '../../utils/components/IsLoading';
import { IsDevToolsEnabled } from '../../dev/components/IsDevToolsEnabled';
import { SyncOutdatedNote } from './SyncOutdatedNote';

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

export interface NoteCardProps extends NoteCardWithToolbarPaperProps {
  /**
   * Render a lightweight version of the component without event listeners
   * that is suitable for drag and drop.
   * @default false
   */
  lightweight?: boolean;
}

export const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(function NoteCard(
  { lightweight = false, ...restProps },
  ref
) {
  const Component = lightweight ? NoteCardPaper : HoverableNoteCardWithToolbarPaper;

  return <Component ref={ref} {...restProps} />;
});

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NoteCardWithToolbarPaperProps extends NodeCardPaperProps {
  //
}

const HoverableNoteCardWithToolbarPaper = forwardRef<
  HTMLDivElement,
  NoteCardWithToolbarPaperProps
>(function HoverableNoteCardWithToolbarPaper(props, ref) {
  const { onClick, onMouseEnter, onMouseLeave, ...restProps } = props;

  const noteId = useNoteId();
  const localOnly = useIsLocalOnlyNote();

  const client = useApolloClient();
  const paperElRef = useRef<HTMLDivElement | null>(null);

  const navigateToNote = useNavigateToNote();

  const selectNoteTrigger = useSelectNoteTrigger(noteId);
  const isAnyNoteSelected = useIsAnyNoteSelected();

  const isSelected = useIsNoteSelected(noteId);
  const isNoteOpen = useIsNoteOpen(noteId);

  // Paper is active when hovering or more options menu is open
  const [isActive, setIsActive] = useState(false);

  const isPaperHover = useCallback(() => {
    const el = paperElRef.current;
    if (!el) {
      return false;
    }

    return isElHover(el);
  }, []);

  const updateIsActive = useCallback(() => {
    requestAnimationFrame(() => {
      setIsActive(isPaperHover());
    });
  }, [isPaperHover]);

  const handleExitedMoreOptionsMenu = useCallback(() => {
    updateIsActive();
  }, [updateIsActive]);

  const handleClick: PaperProps['onClick'] = (e) => {
    if (selectNoteTrigger.getIsControlled()) {
      return;
    }

    onClick?.(e);

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
    onMouseEnter?.(e);
    setIsActive(true);
  };

  const handleMouseLeave: PaperProps['onMouseLeave'] = (e) => {
    onMouseLeave?.(e);
    setIsActive(false);
  };

  const toolbarBoxChildren = useMemo(
    () => (
      <>
        <MemoizedNoteAlwaysButtons />
        <MemoizedNoteMoreOptionsButton onTransitionExited={handleExitedMoreOptionsMenu} />
      </>
    ),
    [handleExitedMoreOptionsMenu]
  );

  return (
    <NoteCardPaper
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
      {...restProps}
      selected={isSelected}
      hidden={isNoteOpen}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      active={isActive}
      ToolbarBoxProps={{
        active: isActive && !isAnyNoteSelected,
        children: toolbarBoxChildren,
      }}
    />
  );
});

const MemoizedNoteAlwaysButtons = memo(NoteAlwaysButtons);
const MemoizedNoteMoreOptionsButton = memo(function MemoizedNoteMoreOptionsButton({
  onTransitionExited,
}: {
  onTransitionExited?: () => void;
}) {
  return (
    <NoteMoreOptionsButton
      IconButtonMenuProps={{
        slotProps: {
          iconButton: {
            edge: 'end',
          },
          menu: {
            onTransitionExited,
          },
        },
      }}
    />
  );
});

type NodeCardPaperProps = PaperStyledProps & {
  ToolbarBoxProps?: ToolbarBoxProps;
};

const NoteCardPaper = forwardRef<HTMLDivElement, NodeCardPaperProps>(
  function NoteCardPaper(props, ref) {
    const { ToolbarBoxProps, ...restProps } = props;

    return (
      <DefaultNoteCardPaper ref={ref} {...restProps}>
        <MainSection />
        <MemoizedDesktopOnActiveToolbarBox {...ToolbarBoxProps} />
      </DefaultNoteCardPaper>
    );
  }
);

function NoteId() {
  const noteId = useNoteId();

  return noteId;
}

function DevRenderNoteId() {
  return (
    <IsDevToolsEnabled>
      <NoteId />
    </IsDevToolsEnabled>
  );
}

const MainSection = memo(function MainSection() {
  return (
    <>
      <SyncOutdatedNote />
      <DuringLoadingNoteRefreshingProgress />
      <DevRenderNoteId />
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
    </>
  );
});

function DuringLoadingNoteRefreshingProgress() {
  return (
    <IsLoading>
      <NoteRefreshingProgress />
    </IsLoading>
  );
}

const NoteRefreshingProgress = memo(function NoteRefreshingProgress() {
  return (
    <Tooltip title="Refreshing">
      <TopRightProgress size="3em" />
    </Tooltip>
  );
});

const TopRightProgress = styled(CircularProgress)(
  ({ theme }) => css`
    position: absolute;
    right: ${theme.spacing(0.5)};
    top: ${theme.spacing(0.5)};
    font-size: 0.5em;
  `
);

const MemoizedDesktopOnActiveToolbarBox = memo(function MemoizedDesktopOnActiveToolbarBox(
  props: Parameters<typeof RenderOnActiveToolbarBox>[0]
) {
  return (
    <IsDesktop>
      <RenderOnActiveToolbarBox {...props} />
    </IsDesktop>
  );
});

const RenderOnActiveToolbarBox = function RenderOnActiveToolbarBox(
  props: ToolbarBoxProps
) {
  const { active = false, children } = props;

  const hasToolbarBeenActiveRef = useRef(active);
  hasToolbarBeenActiveRef.current = hasToolbarBeenActiveRef.current || active;

  const renderToolbarChildren = hasToolbarBeenActiveRef.current;

  return <ToolbarBox {...props}>{renderToolbarChildren && children}</ToolbarBox>;
};

const DefaultNoteCardPaper = forwardRef<HTMLDivElement, PaperStyledProps>(
  function DefaultNoteCardPaper(props, ref) {
    const { elevation = 0, variant = 'outlined', ...restProps } = props;

    return (
      <PaperStyled ref={ref} {...restProps} elevation={elevation} variant={variant} />
    );
  }
);

function baseStyle({ theme }: { theme: Theme }) {
  return css`
    position: relative;
    display: flex;
    flex-direction: column;
    padding: ${theme.spacing(2)};
    border-radius: ${theme.shape.borderRadius * 2}px;
    gap: ${theme.spacing(2)};
    height: 100%;
    width: 100%;
    user-select: none;
  `;
}

interface ActiveStyleProps {
  active?: boolean;
}

const baseActive = {
  style: ({ active = false, theme }: ActiveStyleProps & { theme: Theme }) => {
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
  style: ({ active = false, theme }: ActiveStyleProps & { theme: Theme }) => {
    if (!active || theme.palette.mode !== 'dark') {
      return;
    }

    return css`
      border-color: ${alpha(theme.palette.divider, theme.palette.dividerHoverOpacity)};
    `;
  },
  props: ['active'],
};

interface HiddenStyleProps {
  hidden?: boolean;
}

const hidden = {
  style: ({ hidden = false }: HiddenStyleProps) => {
    if (hidden) {
      return css`
        visibility: hidden;
        pointer-events: none;
      `;
    }
    return;
  },
  props: ['hidden'],
};

interface SelectedStyleProps {
  selected?: boolean;
}

const selected = {
  style: ({ selected = false, theme }: SelectedStyleProps & { theme: Theme }) => {
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

type PaperStyledProps = Parameters<typeof PaperStyled>[0];

const PaperStyled = styled(Paper, {
  shouldForwardProp: mergeShouldForwardProp(
    baseActive.props,
    darkModeActive.props,
    selected.props,
    hidden.props
  ),
})<ActiveStyleProps & SelectedStyleProps & HiddenStyleProps>(
  baseStyle,
  baseActive.style,
  darkModeActive.style,
  selected.style,
  hidden.style
);

interface ToolbarActiveStyleProps {
  active?: boolean;
}

const toolbarActive = {
  style: ({ active = false }: ToolbarActiveStyleProps) => {
    if (active) {
      return css`
        opacity: 1;
      `;
    }
    return css`
      pointer-events: none;
      opacity: 0;
    `;
  },
  props: ['active'],
};

type ToolbarBoxProps = Parameters<typeof ToolbarBox>[0];

const ToolbarBox = styled(Box, {
  shouldForwardProp: mergeShouldForwardProp(toolbarActive.props),
})<ToolbarActiveStyleProps>(
  ({ theme }) => css`
    display: flex;
    justify-content: flex-end;
    transition: ${theme.transitions.create(['opacity'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.shortest,
    })};
    gap: ${theme.spacing(1)};
    min-height: ${theme.spacing(5)};
    margin-bottom: -${theme.spacing(1)};
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
