import { css, styled } from '@mui/material';
import { useEffect, useState } from 'react';

import { useCollabService } from '../hooks/useCollabService';

export function CollabServiceStatus() {
  const collabService = useCollabService();
  const [_renderCounter, setRenderCounter] = useState(0);

  useEffect(() => {
    return collabService.on('serverRevision:changed', () => {
      setRenderCounter((prev) => prev + 1);
    });
  });

  return (
    <NoLayoutDiv
      aria-hidden="true"
      aria-label="collab service status"
      data-revision={collabService.serverRevision}
    />
  );
}

const NoLayoutDiv = styled('div')(css`
  position: absolute;
  visibility: hidden;
`);
