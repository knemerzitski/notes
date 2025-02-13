import { useApolloClient } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
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

import { useId, useState, useCallback, MouseEvent, useEffect } from 'react';

import { Maybe } from '~utils/types';

import { NoteCategory } from '../../__generated__/graphql';
import { useSelectedNoteIdsModel } from '../../note/context/selected-note-ids';
import { useArchiveNoteWithUndo } from '../../note/hooks/useArchiveNoteWithUndo';
import { useDeleteNoteWithConfirm } from '../../note/hooks/useDeleteNoteWithConfirm';
import { useRestoreNoteWithUndo } from '../../note/hooks/useRestoreNoteWithUndo';
import { useSelectedNoteIds } from '../../note/hooks/useSelectedNoteIds';

import { useTrashNoteWithUndo } from '../../note/hooks/useTrashNoteWithUndo';
import { useUnarchiveNoteWithUndo } from '../../note/hooks/useUnarchiveNoteWithUndo';
import { getCategoryName } from '../../note/models/note/category-name';
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

  return (
    <Tooltip title="Selected notes count">
      <span>{noteIds.length}</span>
    </Tooltip>
  );
}

function NotesMoreOptionsButton() {
  const client = useApolloClient();

  const buttonId = useId();
  const menuId = useId();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const menuOpen = anchorEl != null;

  const selectedNoteIdsModel = useSelectedNoteIdsModel();
  const archiveNoteWithUndo = useArchiveNoteWithUndo();
  const unarchiveNoteWithUndo = useUnarchiveNoteWithUndo();
  const trashNoteWithUndo = useTrashNoteWithUndo();
  const restoreNoteWithUndo = useRestoreNoteWithUndo();
  const deleteNoteWithConfirm = useDeleteNoteWithConfirm();

  const [firstSelectedNoteCategory, setFirstSelectedNoteCategory] =
    useState<Maybe<NoteCategory>>(null);

  // Keep track of first selected note category
  useEffect(() => {
    function updateFirstSelectedNoteCategory() {
      const firstNoteId = selectedNoteIdsModel.getAll()[0];
      if (!firstNoteId) {
        setFirstSelectedNoteCategory(null);
      } else {
        setFirstSelectedNoteCategory(
          getCategoryName(
            {
              noteId: firstNoteId,
            },
            client.cache
          )
        );
      }
    }

    updateFirstSelectedNoteCategory();

    return selectedNoteIdsModel.eventBus.on(
      ['added', 'removed'],
      updateFirstSelectedNoteCategory
    );
  }, [selectedNoteIdsModel, client]);

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

  function getSameCategoryNoteIds() {
    if (!firstSelectedNoteCategory) {
      return [];
    }

    return selectedNoteIdsModel.getAll().filter((noteId) => {
      const categoryName = getCategoryName(
        {
          noteId,
        },
        client.cache
      );

      return firstSelectedNoteCategory === categoryName;
    });
  }

  function closeAndClearSelection() {
    handleClose();
    selectedNoteIdsModel.clear();
  }

  function handleArchiveNotes() {
    archiveNoteWithUndo(getSameCategoryNoteIds());
    closeAndClearSelection();
  }

  function handleUnarchiveNotes() {
    unarchiveNoteWithUndo(getSameCategoryNoteIds());
    closeAndClearSelection();
  }

  function handleTrashNotes() {
    trashNoteWithUndo(getSameCategoryNoteIds());
    closeAndClearSelection();
  }

  function handleRestoreNotes() {
    restoreNoteWithUndo(getSameCategoryNoteIds());
    closeAndClearSelection();
  }

  function handleDeleteNotes() {
    void deleteNoteWithConfirm(getSameCategoryNoteIds()).then(() => {
      closeAndClearSelection();
    });
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
        <Tooltip title="More options">
          <MoreVertIcon />
        </Tooltip>
      </IconButton>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': anchorEl?.id,
        }}
        disableScrollLock
        onClick={handleClickMenu}
      >
        <OnCloseProvider onClose={handleClose}>
          {firstSelectedNoteCategory !== NoteCategory.TRASH ? (
            <>
              {firstSelectedNoteCategory !== NoteCategory.ARCHIVE ? (
                <MenuItem
                  aria-label="archive selected notes"
                  onClick={handleArchiveNotes}
                >
                  <ListItemText>Archive</ListItemText>
                </MenuItem>
              ) : (
                // In archive
                <MenuItem
                  aria-label="unarchive selected notes"
                  onClick={handleUnarchiveNotes}
                >
                  <ListItemText>Unarchive</ListItemText>
                </MenuItem>
              )}
              <MenuItem aria-label="delete selected notes" onClick={handleTrashNotes}>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </>
          ) : (
            // In trash
            <>
              <MenuItem aria-label="restore selected notes" onClick={handleRestoreNotes}>
                <ListItemText>Restore</ListItemText>
              </MenuItem>
              <MenuItem
                aria-label="delete selected notes forever"
                onClick={handleDeleteNotes}
              >
                <ListItemText>Delete forever</ListItemText>
              </MenuItem>
            </>
          )}
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
