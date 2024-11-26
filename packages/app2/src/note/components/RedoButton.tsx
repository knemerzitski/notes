import RedoIcon from '@mui/icons-material/Redo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';
import { gql } from '../../__generated__';
import { useNoteId } from '../context/note-id';
import { useQuery } from '@apollo/client';
import { RedoButtonQueryQuery } from '../../__generated__/graphql';

const RedoButton_Query = gql(`
  query RedoButton_Query($id: ObjectID!) {
    userNoteLink(by: { noteId: $id }) @client {
      id
      note {
        id
        collabService 
      }
    }
  }
`);

export function RedoButton(props: Omit<Parameters<typeof NoteDefined>[0], 'note'>) {
  const noteId = useNoteId();
  const { data } = useQuery(RedoButton_Query, {
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
  note: RedoButtonQueryQuery['userNoteLink']['note'];
  IconButtonProps?: Omit<IconButtonProps, 'disabled' | 'aria-label' | 'onClick'>;
}) {
  const service = note.collabService;

  const [canRedo, setCanRedo] = useState(service.canRedo());

  function handleClickRedo() {
    if (!service.redo()) {
      setCanRedo(false);
    }
  }

  useEffect(() => {
    setCanRedo(service.canRedo());
    return service.eventBus.on(['appliedTypingOperation', 'userRecordsUpdated'], () => {
      setCanRedo(service.canRedo());
    });
  }, [service]);

  return (
    <IconButton
      onClick={handleClickRedo}
      aria-label="note history redo"
      disabled={!canRedo}
      {...IconButtonProps}
    >
      <Tooltip title="Redo">
        <RedoIcon />
      </Tooltip>
    </IconButton>
  );
}
