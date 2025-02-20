import { useApolloClient } from '@apollo/client';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Tooltip, Menu, MenuItem, ListItemText } from '@mui/material';
import { useId, useState, useEffect, useCallback, MouseEvent, useRef } from 'react';

import { Note, NoteCategory } from '../../__generated__/graphql';
import { useSelectedNoteIdsModel } from '../../note/context/selected-note-ids';
import { useArchiveNoteWithUndo } from '../../note/hooks/useArchiveNoteWithUndo';
import { useDeleteNoteWithConfirm } from '../../note/hooks/useDeleteNoteWithConfirm';
import { useRestoreNoteWithUndo } from '../../note/hooks/useRestoreNoteWithUndo';
import { useTrashNoteWithUndo } from '../../note/hooks/useTrashNoteWithUndo';
import { useUnarchiveNoteWithUndo } from '../../note/hooks/useUnarchiveNoteWithUndo';
import { getCategoryName } from '../../note/models/note/category-name';
import { useLogger } from '../../utils/context/logger';
import { OnCloseProvider } from '../../utils/context/on-close';

export function SelectedNotesMoreOptionsButton() {
  const logger = useLogger('SelectedNotesMoreOptionsButton');

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

  const [selectedCategories, setSelectedCategories] = useState<NoteCategory[]>([]);
  const selectedCountByCategoryRef = useRef<Record<NoteCategory, number>>(
    createCategoryCounter()
  );

  const validActions = actionsConditions.getValidActions(selectedCategories);

  logger?.debug('categoriesUpdate', {
    selectedCategories,
    validActions,
  });

  useEffect(() => {
    function handleSelectionChanged(
      noteIds: readonly Note['id'][],
      op: 'add' | 'remove'
    ) {
      noteIds.forEach((id) => {
        const name = getCategoryName(
          {
            noteId: id,
          },
          client.cache
        );

        selectedCountByCategoryRef.current[name] += op === 'add' ? 1 : -1;
      });

      setSelectedCategories((prev) => {
        const next = Object.entries(selectedCountByCategoryRef.current)
          .filter(([_, count]) => count > 0)
          .map(([category]) => category as NoteCategory);

        if (prev.length !== next.length) {
          logger?.debug('selectionChange.lengthDiff', {
            prev,
            next,
          });
          return next;
        }

        if (next.some((category) => !prev.includes(category))) {
          logger?.debug('selectionChange.contentsDiff', {
            prev,
            next,
          });
          return next;
        }

        logger?.debug('selectionChange.noDiff');

        return prev;
      });
    }

    handleSelectionChanged(selectedNoteIdsModel.getAll(), 'add');

    // TODO modify mitt package: emitter to return payload type
    const eventOffs = [
      selectedNoteIdsModel.eventBus.on('added', ({ id }) => {
        handleSelectionChanged([id], 'add');
      }),
      selectedNoteIdsModel.eventBus.on('removed', ({ id }) => {
        handleSelectionChanged([id], 'remove');
      }),
    ];

    return () => {
      eventOffs.forEach((eventOff) => {
        eventOff();
      });

      handleSelectionChanged(selectedNoteIdsModel.getAll(), 'remove');
    };
  }, [selectedNoteIdsModel, client, logger]);

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

  function getSelectedNoteIds() {
    return selectedNoteIdsModel.getAll();
  }

  function closeAndClearSelection() {
    handleClose();
    selectedNoteIdsModel.clear();
  }

  function handleArchiveNotes() {
    archiveNoteWithUndo(getSelectedNoteIds());
    closeAndClearSelection();
  }

  function handleUnarchiveNotes() {
    unarchiveNoteWithUndo(getSelectedNoteIds());
    closeAndClearSelection();
  }

  function handleTrashNotes() {
    trashNoteWithUndo(getSelectedNoteIds());
    closeAndClearSelection();
  }

  function handleRestoreNotes() {
    restoreNoteWithUndo(getSelectedNoteIds());
    closeAndClearSelection();
  }

  function handleDeleteNotes() {
    void deleteNoteWithConfirm(getSelectedNoteIds()).then(() => {
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
        disabled={validActions.length === 0}
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
          {validActions.includes('archive') && (
            <MenuItem aria-label="archive selected notes" onClick={handleArchiveNotes}>
              <ListItemText>Archive</ListItemText>
            </MenuItem>
          )}

          {validActions.includes('unarchive') && (
            <MenuItem
              aria-label="unarchive selected notes"
              onClick={handleUnarchiveNotes}
            >
              <ListItemText>Unarchive</ListItemText>
            </MenuItem>
          )}

          {validActions.includes('delete') && (
            <MenuItem aria-label="delete selected notes" onClick={handleTrashNotes}>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          )}

          {validActions.includes('restore') && (
            <MenuItem aria-label="restore selected notes" onClick={handleRestoreNotes}>
              <ListItemText>Restore</ListItemText>
            </MenuItem>
          )}

          {validActions.includes('deleteForever') && (
            <MenuItem
              aria-label="delete selected notes forever"
              onClick={handleDeleteNotes}
            >
              <ListItemText>Delete forever</ListItemText>
            </MenuItem>
          )}
        </OnCloseProvider>
      </Menu>
    </>
  );
}

function createCategoryCounter(): Record<NoteCategory, number> {
  return Object.values(NoteCategory).reduce<Record<string, number>>((obj, name) => {
    obj[name] = 0;
    return obj;
  }, {});
}

type ExpressionValue = NoteCategory;
interface AndOperation {
  and: Expression[];
}
interface NotOperation {
  not: Expression;
}

interface OnlyExpression {
  only: ExpressionValue;
}

type Expression = ExpressionValue | AndOperation | NotOperation | OnlyExpression;

type Action = 'archive' | 'unarchive' | 'delete' | 'restore' | 'deleteForever';

class ActionsConditions {
  private readonly schema: { action: Action; cond: Expression }[] = [
    {
      action: 'archive',
      // !trash && !archived
      cond: {
        and: [
          {
            not: NoteCategory.TRASH,
          },
          {
            not: NoteCategory.ARCHIVE,
          },
        ],
      },
    },
    {
      action: 'unarchive',
      // only archived
      cond: {
        only: NoteCategory.ARCHIVE,
      },
    },
    {
      action: 'delete',
      // !trash
      cond: {
        not: NoteCategory.TRASH,
      },
    },
    {
      action: 'restore',
      // only trash
      cond: {
        only: NoteCategory.TRASH,
      },
    },
    {
      action: 'deleteForever',
      // only trash
      cond: {
        only: NoteCategory.TRASH,
      },
    },
  ];

  getValidActions(categories: readonly NoteCategory[]): Action[] {
    const r = this.schema
      .filter((rule) => this.evalCond(categories, rule.cond))
      .map((rule) => rule.action);
    return r;
  }

  private evalCond(input: readonly NoteCategory[], expr: Expression): boolean {
    if (typeof expr === 'string') {
      return input.includes(expr);
    }

    if ('and' in expr) {
      return expr.and.every((e) => this.evalCond(input, e));
    } else if ('not' in expr) {
      return !this.evalCond(input, expr.not);
    } else if ('only' in expr) {
      return input.length === 1 && input.includes(expr.only);
    }

    return false;
  }
}

const actionsConditions = new ActionsConditions();
