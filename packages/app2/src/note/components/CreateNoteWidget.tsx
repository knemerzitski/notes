import { ClickAwayListener, css, Paper, styled } from '@mui/material';
import { NoteIdProvider } from '../context/note-id';
import { useState } from 'react';
import { CollabContentInput } from './CollabContentInput';
import { CollabInputsColumn } from './CollabInputsColumn';
import { OnCloseProvider } from '../../utils/context/on-close';
import { useCreateNote } from '../hooks/useCreateNote';
import { NoteToolbar } from './NoteToolbar';
import { useCategoryChanged } from '../hooks/useCategoryChanged';
import { NoteCategory } from '../../__generated__/graphql';

export function CreateNoteWidget() {
  const createNote = useCreateNote();

  const noteId = createNote.noteId;

  const [isExpanded, setIsExpanded] = useState(false);

  useCategoryChanged(noteId, (categoryName) => {
    const isNoteDeleted = categoryName === false;
    if (isNoteDeleted || categoryName === NoteCategory.TRASH) {
      setIsExpanded(false);
    }
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
      <BasePaperStyled>
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

BasePaperStyled.defaultProps = {
  variant: 'outlined',
};

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
