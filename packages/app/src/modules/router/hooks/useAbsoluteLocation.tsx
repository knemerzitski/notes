import { useEffect, useState } from 'react';

import { useRouter } from '../context/RouterProvider';

export function useAbsoluteLocation() {
  const router = useRouter();

  const [absoluteLocation, setAbsoluteLocation] = useState(router.state.location);

  useEffect(() => {
    const unsubscribe = router.subscribe(({ location }) => {
      setAbsoluteLocation(location);
    });
    return unsubscribe;
  }, [router]);

  return absoluteLocation;
}
