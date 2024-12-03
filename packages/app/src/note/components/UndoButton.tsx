import { useQuery } from '@apollo/client';
import UndoIcon from '@mui/icons-material/Undo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { gql } from '../../__generated__';
import { UndoButtonQueryQuery } from '../../__generated__/graphql';
import { useNoteId } from '../context/note-id';

const UndoButton_Query = gql(`
  query UndoButton_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      note {
        id
        collabService
      }
    }
  }
`);

// TODO useCollabService

export function UndoButton(props: Omit<Parameters<typeof NoteDefined>[0], 'note'>) {
  const noteId = useNoteId();
  const { data } = useQuery(UndoButton_Query, {
    variables: {
      id: noteId,
    },
  });

  if (!data) {
    return null;
  }

  return <NoteDefined {...props} note={data.userNoteLink.note} />;
}

function NoteDefined({
  note,
  IconButtonProps,
}: {
  note: UndoButtonQueryQuery['userNoteLink']['note'];
  IconButtonProps?: Omit<IconButtonProps, 'disabled' | 'aria-label' | 'onClick'>;
}) {
  const service = note.collabService;

  const [canUndo, setCanUndo] = useState(service.canUndo());

  function handleClickUndo() {
    if (!service.undo()) {
      setCanUndo(false);
    }
  }

  useEffect(() => {
    setCanUndo(service.canUndo());
    return service.eventBus.on(['appliedTypingOperation', 'userRecordsUpdated'], () => {
      setCanUndo(service.canUndo());
    });
  }, [service]);

  return (
    <IconButton
      onClick={handleClickUndo}
      aria-label="note history undo"
      disabled={!canUndo}
      {...IconButtonProps}
    >
      <Tooltip title="Undo">
        <UndoIcon />
      </Tooltip>
    </IconButton>
  );
}
