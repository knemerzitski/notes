import { css, styled } from '@mui/material';
import { useIsCachePending } from '../hooks/useIsCachePending';

export function CacheStatus() {
  const isPending = useIsCachePending();

  return (
    <NoLayoutDiv aria-hidden="true" aria-label="cache status" data-pending={isPending} />
  );
}

const NoLayoutDiv = styled('div')(css`
  position: absolute;
  visibility: hidden;
`);
