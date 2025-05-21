import { css, styled } from '@mui/material';

import { useIsPersistPending } from '../hooks/useIsPersistPending';

export function PersistStatus() {
  const isPending = useIsPersistPending();

  return (
    <NoLayoutDiv
      aria-hidden="true"
      aria-label="persist status"
      data-pending={isPending}
    />
  );
}

const NoLayoutDiv = styled('div')(css`
  position: absolute;
  visibility: hidden;
`);
