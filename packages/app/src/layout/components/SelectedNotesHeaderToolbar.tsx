import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  css,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  styled,
  Toolbar,
  Tooltip,
} from '@mui/material';
import { useSelectedNoteIds } from '../../note/hooks/useSelectedNoteIds';
import { useSelectedNoteIdsModel } from '../../note/context/selected-note-ids';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useId, useState, useCallback, MouseEvent } from 'react';
import { OnCloseProvider } from '../../utils/context/on-close';

export function SelectedNotesHeaderToolbar() {
  return (
    <ToolbarStyled>
      <LeftBox>
        <CloseIconButton />
        <SelectedNotesCount />
      </LeftBox>
      <NotesMoreOptionsButton />
    </ToolbarStyled>
  );
}

function CloseIconButton() {
  const selectedNoteIdsModel = useSelectedNoteIdsModel();
  function handleClose() {
    selectedNoteIdsModel.clear();
  }

  return (
    <IconButton onClick={handleClose} aria-label="close selected notes" edge="start">
      <Tooltip title="Close">
        <CloseIcon />
      </Tooltip>
    </IconButton>
  );
}

function SelectedNotesCount() {
  const noteIds = useSelectedNoteIds();

  return noteIds.length;
}

function NotesMoreOptionsButton() {
  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const menuOpen = anchorEl != null;

  function handleMouseDown(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  function handleOpen(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  function handleClickMenu(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  return (
    <>
      <IconButton
        edge="end"
        id={buttonId}
        aria-controls={menuOpen ? menuId : undefined}
        aria-haspopup={true}
        aria-expanded={menuOpen ? true : undefined}
        onMouseDown={handleMouseDown}
        onClick={handleOpen}
      >
        {' '}
        <Tooltip title="More options">
          <MoreVertIcon />
        </Tooltip>
      </IconButton>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        anchorOrigin={{
          horizontal: 'right',
          vertical: 'top',
        }}
        open={menuOpen}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': anchorEl?.id,
        }}
        disableScrollLock
        onClick={handleClickMenu}
      >
        <OnCloseProvider onClose={handleClose}>
          <MenuItem
            aria-label="archive selected notes"
            onClick={() => {
              console.log('TODO implement');
            }}
          >
            <ListItemText>Archive</ListItemText>
          </MenuItem>
          <MenuItem
            aria-label="delete selected notes"
            onClick={() => {
              console.log('TODO implement');
            }}
          >
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </OnCloseProvider>
      </Menu>
    </>
  );
}

const ToolbarStyled = styled(Toolbar)(css`
  display: flex;
  justify-content: space-between;
`);

const LeftBox = styled(Box)(
  ({ theme }) => css`
    display: flex;
    align-items: center;
    gap: ${theme.spacing(1)};
  `
);
