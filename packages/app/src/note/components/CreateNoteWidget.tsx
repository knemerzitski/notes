import { ClickAwayListener, css, Paper, styled } from '@mui/material';

import { useState } from 'react';

import { OnCloseProvider } from '../../utils/context/on-close';
import { NoteIdProvider } from '../context/note-id';

import { useCreateNote } from '../hooks/useCreateNote';

import { useOnNoteNotEditable } from '../hooks/useOnNoteNotEditable';

import { CollabContentInput } from './CollabContentInput';
import { CollabInputsColumn } from './CollabInputsColumn';

import { NoteToolbar } from './NoteToolbar';

export function CreateNoteWidget() {
  const createNote = useCreateNote();

  const noteId = createNote.noteId;

  const [isExpanded, setIsExpanded] = useState(false);

  useOnNoteNotEditable(noteId, () => {
    setIsExpanded(false);
  });

  function handleExpand() {
    setIsExpanded(true);
  }

  function handleChange() {
    void createNote.create();
  }

  function handleCollapse() {
    setIsExpanded(false);
    createNote.complete();
  }

  return (
    <NoteIdProvider noteId={noteId}>
      <OnCloseProvider onClose={handleCollapse}>
        {isExpanded ? (
          <ExpandedWidget onCollapse={handleCollapse} onChange={handleChange} />
        ) : (
          <CollapsedWidget onExpand={handleExpand} onChange={handleChange} />
        )}
      </OnCloseProvider>
    </NoteIdProvider>
  );
}

function CollapsedWidget({
  onExpand,
  onChange,
}: {
  onExpand: () => void;
  onChange: () => void;
}) {
  function handleFocus() {
    onExpand();
  }

  return (
    <CollapsedPaperStyled>
      <CollabContentInput
        placeholder="Take a note..."
        onFocus={handleFocus}
        onChange={onChange}
      />
    </CollapsedPaperStyled>
  );
}

function ExpandedWidget({
  onCollapse,
  onChange: onChange,
}: {
  onCollapse: () => void;
  onChange: () => void;
}) {
  function handleClickAway() {
    onCollapse();
  }

  return (
    <ClickAwayListener
      onClickAway={handleClickAway}
      touchEvent="onTouchStart"
      mouseEvent="onMouseDown"
    >
      <BasePaperStyled variant="outlined">
        <CollabInputsColumn
          CollabInputsProps={{
            CollabTitleInputProps: {
              onChange,
            },
            CollabContentInputProps: {
              autoFocus: true,
              onChange,
            },
          }}
        />
        <RoundBottomNoteToolbar />
      </BasePaperStyled>
    </ClickAwayListener>
  );
}

const BasePaperStyled = styled(Paper)(
  ({ theme }) => css`
    border-radius: ${theme.shape.borderRadius * 2}px;
    box-shadow: ${theme.shadows['3']};
    width: min(100%, 600px);
  `
);

const CollapsedPaperStyled = styled(BasePaperStyled)(
  ({ theme }) => css`
    padding: ${theme.spacing(2)};
  `
);

const RoundBottomNoteToolbar = styled(NoteToolbar)(
  ({ theme }) => css`
    border-bottom-left-radius: ${theme.shape.borderRadius * 2}px;
    border-bottom-right-radius: ${theme.shape.borderRadius * 2}px;
  `
);
