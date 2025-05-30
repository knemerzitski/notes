import { ClickAwayListener, css, Paper, styled } from '@mui/material';

import { forwardRef, useState } from 'react';

import { OnCloseProvider } from '../../utils/context/on-close';
import { useDescentantUnfocusedListener } from '../../utils/hooks/useDescentantUnfocusedListener';
import { NoteIdProvider } from '../context/note-id';

import { useSelectedNoteIdsModel } from '../context/selected-note-ids';
import { useCreateNote } from '../hooks/useCreateNote';

import { useOnNoteNotEditable } from '../hooks/useOnNoteNotEditable';

import { CollabContentInput } from './CollabContentInput';
import { CollabInputsColumn } from './CollabInputsColumn';

import { NoteToolbar } from './NoteToolbar';

export function CreateNoteWidget() {
  const selectedNoteIdsModel = useSelectedNoteIdsModel();

  const createNote = useCreateNote();

  const noteId = createNote.noteId;

  const [isExpanded, setIsExpanded] = useState(false);

  useOnNoteNotEditable(noteId, () => {
    setIsExpanded(false);
  });

  function handleExpand() {
    selectedNoteIdsModel.clear();
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
    <CollapsedPaperStyled aria-label="create note widget" data-collapsed={true}>
      <CollabContentInput
        slotProps={{
          input: {
            'aria-label': 'create note input',
            placeholder: 'Take a note...',
            onFocus: handleFocus,
            onChange,
          },
        }}
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
  const ref = useDescentantUnfocusedListener(
    () => {
      onCollapse();
    },
    {
      ignoreFirstFocus: true,
    }
  );

  function handleClickAway() {
    onCollapse();
  }

  return (
    <ClickAwayListener
      onClickAway={handleClickAway}
      touchEvent="onTouchStart"
      mouseEvent="onMouseDown"
    >
      <BasePaperDefaultPropsStyled
        ref={ref}
        aria-label="create note widget"
        data-collapsed={false}
      >
        <CollabInputsColumn
          CollabInputsProps={{
            CollabTitleInputProps: {
              slotProps: {
                input: {
                  onChange,
                },
              },
            },
            CollabContentInputProps: {
              slotProps: {
                input: {
                  autoFocus: true,
                  onChange,
                },
              },
            },
          }}
        />
        <RoundBottomNoteToolbar />
      </BasePaperDefaultPropsStyled>
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

const BasePaperDefaultPropsStyled = forwardRef<
  HTMLDivElement,
  Parameters<typeof BasePaperStyled>[0]
>(function MyBasePaperStyled(props, ref) {
  return <BasePaperStyled ref={ref} variant="outlined" {...props} />;
});

const CollapsedPaperStyled = styled(BasePaperDefaultPropsStyled)(
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
