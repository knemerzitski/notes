import { css, styled } from '@mui/material';
import { useEffect, useState } from 'react';

import { useCollabService } from '../hooks/useCollabService';

export function CollabServiceStatus() {
  const collabService = useCollabService(true);
  const [_renderCounter, setRenderCounter] = useState(0);

  useEffect(() => {
    if (!collabService) {
      return;
    }

    return collabService.eventBus.on('headRevisionChanged', () => {
      setRenderCounter((prev) => prev + 1);
    });
  });

  if (!collabService) {
    return null;
  }

  return (
    <NoLayoutDiv
      aria-hidden="true"
      aria-label="collab service status"
      data-revision={collabService.headRevision}
    />
  );
}

const NoLayoutDiv = styled('div')(css`
  position: absolute;
  visibility: hidden;
`);
