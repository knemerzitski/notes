import RedoIcon from '@mui/icons-material/Redo';
import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { Suspense, useEffect, useState } from 'react';

import { useCollabService } from '../hooks/useCollabService';

export function RedoButton(props: Parameters<typeof Loaded>[0]) {
  return (
    <Suspense fallback={<Fallback />}>
      <Loaded {...props} />
    </Suspense>
  );
}

function Loaded({
  IconButtonProps,
}: {
  IconButtonProps?: Omit<IconButtonProps, 'disabled' | 'aria-label' | 'onClick'>;
}) {
  const collabService = useCollabService();

  const [canRedo, setCanRedo] = useState(collabService.canRedo());

  function handleClickRedo() {
    if (!collabService.redo()) {
      setCanRedo(false);
    }
  }

  useEffect(() => {
    setCanRedo(collabService.canRedo());
    return collabService.on(['localTyping:applied', 'records:updated'], () => {
      setCanRedo(collabService.canRedo());
    });
  }, [collabService]);

  return (
    <Base
      onPointerUp={() => {
        handleClickRedo();
      }}
      onTouchEnd={(e) => {
        // Prevent closing virtual keyboard on mobile
        e.preventDefault();
      }}
      aria-label="history redo"
      disabled={!canRedo}
      {...IconButtonProps}
    />
  );
}

function Fallback() {
  return <Base disabled={true} />;
}

function Base(props?: IconButtonProps) {
  return (
    <IconButton {...props}>
      <Tooltip title="Redo">
        <RedoIcon />
      </Tooltip>
    </IconButton>
  );
}
