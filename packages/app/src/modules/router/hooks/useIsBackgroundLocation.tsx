import { useLocation } from 'react-router-dom';

import { useAbsoluteLocation } from './useAbsoluteLocation';

export function useIsBackgroundLocation() {
  const abs = useAbsoluteLocation();
  const cur = useLocation();

  return (
    abs.pathname !== cur.pathname ||
    abs.search !== cur.search ||
    abs.hash !== cur.hash ||
    abs.key !== cur.key ||
    abs.state !== cur.state
  );
}
