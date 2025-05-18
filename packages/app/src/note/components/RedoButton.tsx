import RedoIcon from '@mui/icons-material/Redo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { CollabService } from '../../../../collab2/src';

import { useCollabService } from '../hooks/useCollabService';

export function RedoButton(
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
  const [canRedo, setCanRedo] = useState(service.canRedo());

  function handleClickRedo() {
    if (!service.redo()) {
      setCanRedo(false);
    }
  }

  useEffect(() => {
    setCanRedo(service.canRedo());
    return service.on(['localTyping:applied', 'records:updated'], () => {
      setCanRedo(service.canRedo());
    });
  }, [service]);

  return (
    <IconButton
      onClick={handleClickRedo}
      aria-label="history redo"
      disabled={!canRedo}
      {...IconButtonProps}
    >
      <Tooltip title="Redo">
        <RedoIcon />
      </Tooltip>
    </IconButton>
  );
}
