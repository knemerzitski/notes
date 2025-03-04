import { useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { Maybe } from '../../../../utils/src/types';

export function useIsPathname(
  pathname: Maybe<string>,
  options?: { startsWith?: boolean }
) {
  const router = useRouter();
  const [isPathname, setIsPathname] = useState(
    router.state.location.pathname === pathname
  );

  const startsWith = options?.startsWith;

  useEffect(
    () =>
      router.subscribe('onLoad', ({ toLocation }) => {
        if (startsWith) {
          setIsPathname(toLocation.pathname.startsWith(pathname ?? ''));
        } else {
          setIsPathname(pathname === toLocation.pathname);
        }
      }),
    [router, pathname, startsWith]
  );

  return isPathname;
}
