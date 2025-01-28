import UndoIcon from '@mui/icons-material/Undo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { CollabService } from '~collab/client/collab-service';

import { useCollabService } from '../hooks/useCollabService';

export function UndoButton(
  props: Omit<Parameters<typeof CollabServiceDefined>[0], 'service'>
) {
  const collabService = useCollabService(true);

  if (!collabService) {
    return null;
  }

  return <CollabServiceDefined {...props} service={collabService} />;
}

function CollabServiceDefined({
  service,
  IconButtonProps,
}: {
  service: CollabService;
  IconButtonProps?: Omit<IconButtonProps, 'disabled' | 'aria-label' | 'onClick'>;
}) {
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
